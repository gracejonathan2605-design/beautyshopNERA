import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PRODUCT_IMAGES_BUCKET } from "../src/lib/supabase/env";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureProductImagesBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existing = buckets?.find((b) => b.id === PRODUCT_IMAGES_BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error) throw error;
    console.log(`Bucket ${PRODUCT_IMAGES_BUCKET} créé (public).`);
  } else {
    const { error } = await supabase.storage.updateBucket(PRODUCT_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error) throw error;
    console.log(`Bucket ${PRODUCT_IMAGES_BUCKET} déjà présent, options mises à jour.`);
  }
}

async function deleteProbeBucket() {
  const { error: emptyError } = await supabase.storage.emptyBucket("nera-probe");
  if (emptyError && !/not found|does not exist/i.test(emptyError.message)) {
    console.warn("nera-probe empty:", emptyError.message);
  }
  const { error } = await supabase.storage.deleteBucket("nera-probe");
  if (error && !/not found|does not exist/i.test(error.message)) {
    console.warn("nera-probe delete:", error.message);
  } else if (!error) {
    console.log("Bucket de sonde nera-probe supprimé.");
  }
}

async function main() {
  await ensureProductImagesBucket();
  await deleteProbeBucket();

  const db = process.env.DATABASE_URL ?? "";
  if (db.includes("supabase.co") || db.includes("pooler.supabase.com")) {
    console.log("DATABASE_URL pointe vers Supabase — lancer ensuite :");
    console.log("  npx prisma migrate deploy && npx prisma db seed");
    console.log("  puis coller supabase/rls.sql dans le SQL Editor.");
  } else {
    console.log("Storage OK. Pour Postgres, coller l’URI de connexion (Dashboard → Database) dans DATABASE_URL et DIRECT_URL.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
