import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Climb } from '@/constants/climbing';

const STORAGE_KEY = 'crux.climbs.v1';

type Ctx = {
  climbs: Climb[];
  loaded: boolean;
  upsert: (c: Climb) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const ClimbsContext = createContext<Ctx | null>(null);

export function ClimbsProvider({ children }: { children: React.ReactNode }) {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  const persist = useCallback(async (next: Climb[]) => {
    setClimbs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const upsert = useCallback(async (c: Climb) => {
    const next = climbs.some(x => x.id === c.id)
      ? climbs.map(x => (x.id === c.id ? c : x))
      : [...climbs, c];
    await persist(next);
  }, [climbs, persist]);

  const remove = useCallback(async (id: string) => {
    await persist(climbs.filter(c => c.id !== id));
  }, [climbs, persist]);

  return (
    <ClimbsContext.Provider value={{ climbs, loaded, upsert, remove }}>
      {children}
    </ClimbsContext.Provider>
  );
}

export function useClimbs() {
  const ctx = useContext(ClimbsContext);
  if (!ctx) throw new Error('useClimbs must be used inside ClimbsProvider');
  return ctx;
}
