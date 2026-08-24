import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseAdminConfig, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

let admin: SupabaseClient | undefined;

/** Client serveur uniquement (service_role). Ne jamais importer dans un composant client. */
export function createSupabaseAdmin() {
  assertSupabaseAdminConfig();
  if (!admin) {
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
