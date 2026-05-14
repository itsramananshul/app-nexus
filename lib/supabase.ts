import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Service-role-only client — never call from the browser. Nexus uses this
// strictly to read/write the active_client_keys table that holds the per-node
// API keys the team has paste-saved.
export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "Supabase admin env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const ACTIVE_CLIENT_KEYS_TABLE = "active_client_keys";
export const NEXUS_APP_TYPE = "nexus";
