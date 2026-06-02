import { createClient, SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

export const isSupabaseConfigured =
  supabaseUrl !== PLACEHOLDER_URL && supabaseAnonKey !== PLACEHOLDER_KEY;

let supabaseInstance: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient(): SupabaseClient {
  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (supabaseInstance as any)[prop];
  },
});

export function setSupabaseAuth(token: string): void {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function clearSupabaseAuth(): void {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}
