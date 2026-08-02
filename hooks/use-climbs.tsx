import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Climb, ClimbStyle, ClimbTag, Grade } from '@/constants/climbing';
import { genId, isSupabaseConfigured, isUuid, supabase, type DbClimb } from '@/lib/supabase';
import { useCurrentUser } from './use-current-user';

const STORAGE_KEY = 'crux.climbs.v1';

type Ctx = {
  climbs: Climb[];
  loaded: boolean;
  upsert: (c: Climb) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Force a re-fetch from the backend (no-op if not configured). */
  refresh: () => Promise<void>;
};

const ClimbsContext = createContext<Ctx | null>(null);

// ─── DB ↔ app conversions ──────────────────────────────────────────────────
function toDb(c: Climb, userId: string): Omit<DbClimb, 'created_at' | 'updated_at'> {
  return {
    id: c.id,
    user_id: userId,
    grade_low: c.gradeLow,
    grade_high: c.gradeHigh,
    sent: c.sent,
    style: c.style ?? null,
    tags: c.tags ?? [],
    hold_color: c.holdColor ?? null,
    count: c.count ?? 1,
    route_name: c.routeName ?? null,
    location: c.location ?? null,
    setter: c.setter ?? null,
    notes: c.notes ?? null,
    attempts: c.attempts ?? null,
    sessions: c.sessions ?? null,
    route_media: c.routeMedia ?? null,
    climb_media: c.climbMedia ?? null,
    date: c.date,
    visibility: 'public',
  };
}

function fromDb(r: DbClimb): Climb {
  return {
    id: r.id,
    gradeLow: r.grade_low as Grade,
    gradeHigh: r.grade_high as Grade,
    sent: r.sent,
    style: (r.style as ClimbStyle | null) ?? undefined,
    tags: (r.tags as ClimbTag[] | null) ?? undefined,
    holdColor: r.hold_color ?? undefined,
    count: r.count ?? undefined,
    routeName: r.route_name ?? undefined,
    location: r.location ?? undefined,
    setter: r.setter ?? undefined,
    notes: r.notes ?? undefined,
    attempts: r.attempts,
    sessions: r.sessions,
    routeMedia: (r.route_media as Climb['routeMedia']) ?? null,
    climbMedia: (r.climb_media as Climb['climbMedia']) ?? null,
    date: r.date,
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────
export function ClimbsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 1. Load cache immediately (this is the source of truth until proven otherwise)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setClimbs(JSON.parse(raw));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persistLocal = useCallback(async (next: Climb[]) => {
    setClimbs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // 2. Sync with Supabase. Defensively: NEVER drop a local row that the
  // server doesn't confirm — only merge in additional server rows.
  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;

    // Read fresh local cache (don't trust state — could be stale during init)
    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
    let cached: Climb[] = cachedRaw ? JSON.parse(cachedRaw) : [];

    // Migrate any non-UUID ids in local cache (legacy from older builds)
    let migrated = false;
    cached = cached.map(c => {
      if (!isUuid(c.id)) {
        migrated = true;
        return { ...c, id: genId() };
      }
      return c;
    });
    if (migrated) await persistLocal(cached);

    // Push every local climb individually so one bad row can't take down the batch.
    const pushedIds = new Set<string>();
    for (const c of cached) {
      const { error } = await supabase
        .from('climbs')
        .upsert(toDb(c, user.id), { onConflict: 'id' });
      if (error) {
        console.warn('[crux] failed to push climb', c.id, error.message);
      } else {
        pushedIds.add(c.id);
      }
    }

    // Fetch server state for this user
    const { data, error: fetchErr } = await supabase
      .from('climbs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (fetchErr) {
      console.warn('[crux] climbs fetch failed:', fetchErr.message);
      return; // leave local untouched
    }

    const serverClimbs = (data as DbClimb[]).map(fromDb);
    const serverIds = new Set(serverClimbs.map(c => c.id));

    // Merge: take server version where it exists, but PRESERVE any local row
    // the server doesn't know about (push must have failed). Never drop data.
    const localOnly = cached.filter(c => !serverIds.has(c.id));
    await persistLocal([...serverClimbs, ...localOnly]);
  }, [user, persistLocal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const upsert = useCallback(
    async (c: Climb) => {
      // Always make sure ids are UUIDs going forward.
      const safe: Climb = isUuid(c.id) ? c : { ...c, id: genId() };
      const next = climbs.some(x => x.id === safe.id)
        ? climbs.map(x => (x.id === safe.id ? safe : x))
        : [...climbs, safe];
      await persistLocal(next);

      if (user && isSupabaseConfigured) {
        const { error } = await supabase
          .from('climbs')
          .upsert(toDb(safe, user.id), { onConflict: 'id' });
        if (error) console.warn('[crux] upsert climb failed:', error.message);
      }
    },
    [climbs, persistLocal, user]
  );

  const remove = useCallback(
    async (id: string) => {
      await persistLocal(climbs.filter(c => c.id !== id));
      if (user && isSupabaseConfigured) {
        const { error } = await supabase.from('climbs').delete().eq('id', id);
        if (error) console.warn('[crux] delete climb failed:', error.message);
      }
    },
    [climbs, persistLocal, user]
  );

  return (
    <ClimbsContext.Provider value={{ climbs, loaded, upsert, remove, refresh }}>
      {children}
    </ClimbsContext.Provider>
  );
}

export function useClimbs() {
  const ctx = useContext(ClimbsContext);
  if (!ctx) throw new Error('useClimbs must be used inside ClimbsProvider');
  return ctx;
}
