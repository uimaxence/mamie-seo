import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client-side Supabase client using anon key (safe to expose)
// Used for authentication only — all data operations go through API routes with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy init to avoid build-time errors when env vars aren't set
let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase anon key not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

// Backwards compat — will throw at runtime if not configured, but not at import time
export const supabaseBrowser = typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
