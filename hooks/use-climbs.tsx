import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Climb, ClimbStyle, ClimbTag, Grade } from '@/constants/climbing';
import { isSupabaseConfigured, supabase, type DbClimb } from '@/lib/supabase';
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

  // 1. Load cache immediately
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

  // 2. When user is known + supabase configured, fetch from server, push up
  // any local-only climbs (one-time migration), and prefer server state.
  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;

    // Push any local climbs the server doesn't know about yet.
    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const cached: Climb[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    if (cached.length) {
      const rows = cached.map(c => toDb(c, user.id));
      // Upsert handles both initial migration and edits.
      const { error } = await supabase.from('climbs').upsert(rows, { onConflict: 'id' });
      if (error) console.warn('[crux] climb upsert failed:', error.message);
    }

    const { data, error } = await supabase
      .from('climbs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (error) {
      console.warn('[crux] climbs fetch failed:', error.message);
      return;
    }
    const next = (data as DbClimb[]).map(fromDb);
    await persistLocal(next);
  }, [user, persistLocal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const upsert = useCallback(
    async (c: Climb) => {
      const next = climbs.some(x => x.id === c.id)
        ? climbs.map(x => (x.id === c.id ? c : x))
        : [...climbs, c];
      await persistLocal(next);

      if (user && isSupabaseConfigured) {
        const { error } = await supabase
          .from('climbs')
          .upsert(toDb(c, user.id), { onConflict: 'id' });
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
