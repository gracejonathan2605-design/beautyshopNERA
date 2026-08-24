export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const PRODUCT_IMAGES_BUCKET = "product-images";

export function assertSupabasePublicConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  }
}

export function assertSupabaseAdminConfig() {
  assertSupabasePublicConfig();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante — réservée au serveur.");
  }
}
