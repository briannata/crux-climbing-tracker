import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase, type DbUser } from '@/lib/supabase';

const STORAGE_KEY = 'crux.user.v1';

export type CurrentUser = {
  id: string;
  name: string;
  displayName?: string | null;
};

type Ctx = {
  user: CurrentUser | null;
  loaded: boolean;
  /** Create a new user row in Supabase (or just locally if offline) and store the id locally. */
  signUp: (name: string) => Promise<CurrentUser>;
  /** Forget the current local user — the row stays in Supabase. */
  signOut: () => Promise<void>;
};

const CurrentUserContext = createContext<Ctx | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const signUp = useCallback(async (rawName: string): Promise<CurrentUser> => {
    const name = rawName.trim();
    if (!name) throw new Error('Name is required');

    let row: CurrentUser;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .insert({ name })
        .select()
        .single<DbUser>();
      if (error) throw error;
      row = { id: data.id, name: data.name, displayName: data.display_name };
    } else {
      // Offline fallback: synthesize a UUID-like id locally
      row = { id: crypto.randomUUID?.() || `local-${Date.now()}`, name };
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(row));
    setUser(row);
    return row;
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <CurrentUserContext.Provider value={{ user, loaded, signUp, signOut }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return ctx;
}
