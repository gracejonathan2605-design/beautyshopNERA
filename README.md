# NERA Beauté & Shop

Système unique (boutique en ligne + POS + administration) pour **NERA Beauté & Shop**, Yaoundé, Cameroun. Devise : **FCFA**.

## Stack

Next.js 16 · TypeScript · Tailwind CSS · PostgreSQL (Supabase) · Prisma · Auth JWT httpOnly · Storage Supabase · Zod

## Secrets

Ne commitez **jamais** :

- `SUPABASE_SERVICE_ROLE_KEY`
- mot de passe Postgres
- emails / mots de passe du personnel

Collez-les uniquement dans `.env` (ignoré par git) et dans les variables d’environnement Vercel.

Les comptes locaux se créent avec `npx prisma db seed` à partir des variables `SEED_*` de `.env` (voir `.env.example`). Aucun mot de passe réel ne figure dans ce README.

## Supabase

- **Postgres** : Prisma via le pooler **session** (port 5432 — les ventes/stock ont besoin de transactions interactives)
- **Storage** : bucket public `product-images` (photos catalogue, compressées en WebP à l’envoi)
- **Auth GoTrue** : non utilisé pour le staff (JWT httpOnly). Les clés anon / service_role servent à Storage.

URI type (valeurs dans `.env`, jamais ici) :

```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="$DATABASE_URL"
```

Schéma, seed et RLS se préparent ainsi sur une machine neuve :

```bash
cp .env.example .env
# remplir DATABASE_URL, DIRECT_URL, AUTH_SECRET, clés Supabase, SEED_*

npx prisma migrate deploy
npx prisma db seed
# supabase/rls.sql (bloque anon/authenticated sur les tables métier)
npm run supabase:setup
```

### Storage

```bash
npm run supabase:setup
```

Crée/met à jour `product-images`. L’admin produits envoie les images via le service_role (serveur uniquement). Les photos sont **compressées automatiquement** (WebP, max 1400 px) sur l’appareil puis de nouveau sur le serveur, pour rester légères en boutique.

## Vercel

Le SQL Supabase est géré par `prisma migrate deploy` au build. Si Vercel affiche **Ready** mais le site est blanc ou 404 :

1. **Protection des déploiements** : Settings → Deployment Protection → désactiver *Vercel Authentication* (Preview **et** Production) si la boutique doit être publique.
2. **Domaine de production** : Settings → Domains → assigner le domaine au dernier déploiement Production.
3. **Variables d’environnement** (Production + Preview) puis Redeploy : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Contrôle : `https://<domaine>/api/health` doit renvoyer `"ok": true`.

## Démarrage local

```bash
cp .env.example .env
# Ajuster DATABASE_URL et les SEED_*
npx prisma migrate dev
npx prisma db seed
npm run dev
```

PostgreSQL 16 doit écouter sur `127.0.0.1:5432` (utilisateur `nera` / base `nera_beaute`).

## Surfaces

- Boutique : `/`
- Caisse : `/pos`
- Admin : `/admin`
- Connexion staff : `/login`

Le stock est **unique** : une vente POS ou une commande en ligne mouvemente le même inventaire, en transaction.

Les paiements Mobile Money / carte en ligne sont saisis manuellement pour l’instant (adaptateur prêt, pas de faux prestataire).
