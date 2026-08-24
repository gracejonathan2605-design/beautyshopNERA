import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicConfig, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let browser: SupabaseClient | undefined;

/** Client navigateur (clé anon / publishable). Pas de service_role ici. */
export function createSupabaseBrowser() {
  assertSupabasePublicConfig();
  if (!browser) {
    browser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browser;
}
