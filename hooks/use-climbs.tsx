import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Climb, ClimbMedia, ClimbStyle, ClimbTag, Grade } from '@/constants/climbing';
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
    media: c.media ?? [],
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
    // `undefined` (not `[]`) when the column does not exist yet, so the sync
    // merge can tell "no media" apart from "server doesn't know about media".
    media: Array.isArray(r.media) ? (r.media as ClimbMedia[]) : undefined,
    routeMedia: (r.route_media as Climb['routeMedia']) ?? null,
    climbMedia: (r.climb_media as Climb['climbMedia']) ?? null,
    date: r.date,
  };
}

/**
 * Columns added by migrations after the table was first created, and the climb
 * field each one fills. A database that hasn't run a migration yet simply
 * lacks the column.
 */
const MIGRATED_COLUMNS = { setter: 'setter', media: 'media' } as const;

/** The column PostgREST reports as missing, e.g. "Could not find the 'setter' column". */
function missingColumn(error: { code?: string; message?: string } | null): string | null {
  if (!error || error.code !== 'PGRST204') return null;
  return /'([^']+)' column/.exec(error.message ?? '')?.[1] ?? null;
}

const warnedColumns = new Set<string>();

/**
 * Push one climb. PostgREST rejects a whole row when it names a column the
 * database doesn't have, so a single skipped migration would otherwise stop
 * every climb syncing -- which is what happened when `setter` shipped without
 * its column. Drop each missing column and retry, so everything else still
 * syncs and only the new field waits for the migration.
 */
async function pushClimb(c: Climb, userId: string) {
  const row: Record<string, unknown> = { ...toDb(c, userId) };
  for (let tries = 0; tries <= Object.keys(MIGRATED_COLUMNS).length; tries++) {
    const { error } = await supabase.from('climbs').upsert(row, { onConflict: 'id' });
    const column = missingColumn(error);
    if (!column || !(column in row)) return error;

    if (!warnedColumns.has(column)) {
      warnedColumns.add(column);
      console.warn(
        `[crux] database has no '${column}' column; syncing without it. ` +
          'Run the migrations in supabase/schema.sql.'
      );
    }
    delete row[column];
  }
  return null;
}

// ─── Provider ──────────────────────────────────────────────────────────────
export function ClimbsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Mutations read the list through this ref rather than through the state
  // captured at render. Without it, awaiting several upserts in a row (the
  // media backup does exactly that) has each one start from the same stale
  // array, so only the last write survives.
  const climbsRef = useRef<Climb[]>([]);

  // 1. Load cache immediately (this is the source of truth until proven otherwise)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Climb[] = JSON.parse(raw);
          climbsRef.current = parsed;
          setClimbs(parsed);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persistLocal = useCallback(async (next: Climb[]) => {
    // Update the ref first and synchronously, so a following mutation in the
    // same tick composes onto this one instead of clobbering it.
    climbsRef.current = next;
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
      const error = await pushClimb(c, user.id);
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

    const rows = data as DbClimb[];
    const serverIds = new Set(rows.map(r => r.id));

    // Merge: take server version where it exists, but PRESERVE any local row
    // the server doesn't know about (push must have failed). Never drop data.
    const localOnly = cached.filter(c => !serverIds.has(c.id));

    // A column the database hasn't been migrated to have is simply absent from
    // its rows. Keep the local value for it, rather than letting the server's
    // copy erase a setter or media list that couldn't be synced yet.
    const cachedById = new Map(cached.map(c => [c.id, c]));
    const merged = rows.map(row => {
      const server = fromDb(row);
      const local = cachedById.get(row.id);
      if (!local) return server;
      let result = server;
      for (const [column, field] of Object.entries(MIGRATED_COLUMNS)) {
        if (!(column in row)) result = { ...result, [field]: local[field] };
      }
      return result;
    });

    await persistLocal([...merged, ...localOnly]);
  }, [user, persistLocal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const upsert = useCallback(
    async (c: Climb) => {
      // Always make sure ids are UUIDs going forward.
      const safe: Climb = isUuid(c.id) ? c : { ...c, id: genId() };
      const current = climbsRef.current;
      const next = current.some(x => x.id === safe.id)
        ? current.map(x => (x.id === safe.id ? safe : x))
        : [...current, safe];
      await persistLocal(next);

      if (user && isSupabaseConfigured) {
        const error = await pushClimb(safe, user.id);
        if (error) console.warn('[crux] upsert climb failed:', error.message);
      }
    },
    [persistLocal, user]
  );

  const remove = useCallback(
    async (id: string) => {
      await persistLocal(climbsRef.current.filter(c => c.id !== id));
      if (user && isSupabaseConfigured) {
        const { error } = await supabase.from('climbs').delete().eq('id', id);
        if (error) console.warn('[crux] delete climb failed:', error.message);
      }
    },
    [persistLocal, user]
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
