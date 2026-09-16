import { createClient } from "@supabase/supabase-js";
import type { AppConfig } from "../config.js";

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const;

export function createSupabaseAdmin(config: AppConfig) {
  return createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SECRET_KEY,
    serverAuthOptions,
  );
}

export function createSupabaseAuth(config: AppConfig) {
  return createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    serverAuthOptions,
  );
}

export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
export type SupabaseAuth = ReturnType<typeof createSupabaseAuth>;
