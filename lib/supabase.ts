import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = !!(url && anonKey);

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    '[crux] Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. Running in offline-only mode.'
  );
}

// We don't use Supabase Auth in this app, but the client still expects an
// auth storage. Using AsyncStorage avoids errors and keeps things tidy.
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// ─── Database row types (snake_case as stored) ─────────────────────────────
export type DbUser = {
  id: string;
  name: string;
  display_name: string | null;
  created_at: string;
};

// ─── ID helpers ────────────────────────────────────────────────────────────
// RFC 4122 v4 UUID. Math.random is fine for client ids; the server's the
// source of uniqueness anyway.
export function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

export type DbClimb = {
  id: string;
  user_id: string;
  grade_low: string;
  grade_high: string;
  sent: boolean;
  style: string | null;
  tags: string[] | null;
  hold_color: string | null;
  count: number | null;
  route_name: string | null;
  location: string | null;
  notes: string | null;
  attempts: number | null;
  sessions: number | null;
  route_media: unknown | null;
  climb_media: unknown | null;
  date: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
};
