# NERA Beauté & Shop

Système unique (boutique en ligne + POS + administration) pour **NERA Beauté & Shop**, Yaoundé, Cameroun. Devise : **FCFA**.

## Stack

Next.js 16 · TypeScript · Tailwind CSS · PostgreSQL (Supabase) · Prisma · Auth JWT httpOnly · Storage Supabase · Zod

## Supabase

Le projet est branché sur `https://lqlfciaelhmaozxwunun.supabase.co` :

- **Postgres** : Prisma via le pooler session `aws-1-eu-west-3` (port 5432 — les ventes/stock ont besoin de transactions interactives)
- **Storage** : bucket public `product-images` (photos catalogue)
- **Auth GoTrue** : non utilisé pour le staff (JWT httpOnly existant). Les clés anon / service_role servent à Storage.

Les secrets (`SUPABASE_SERVICE_ROLE_KEY`, mot de passe Postgres) ne vont **jamais** dans git. Collez-les dans `.env` et dans Vercel.

Schéma, seed et RLS sont **déjà appliqués** sur ce projet. Pour une machine neuve :

```bash
# Session pooler (IPv4) — même URI pour DATABASE_URL et DIRECT_URL
DATABASE_URL="postgresql://postgres.lqlfciaelhmaozxwunun:[DB_PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="$DATABASE_URL"

npx prisma migrate deploy
npx prisma db seed
# supabase/rls.sql (bloque anon/authenticated sur les tables métier)
npm run supabase:setup
```

### Storage

```bash
npm run supabase:setup
```

Crée/met à jour `product-images` et supprime le bucket de sonde. L’admin produits envoie les images via le service_role (serveur uniquement).

## Vercel (page vide / Ready mais rien)

Le SQL Supabase est bon. Si Vercel affiche **Ready** mais le site est blanc ou 404 :

1. **Protection des déploiements** : Settings → Deployment Protection → désactiver *Vercel Authentication* (Preview **et** Production). Sinon le visiteur est renvoyé vers un login Vercel.
2. **Domaine de production** : Settings → Domains → assigner `beautyshop-nera.vercel.app` au dernier déploiement Production. Aujourd’hui cette URL répond `NOT_FOUND`.
3. **Variables d’environnement** (Production + Preview) puis Redeploy :

```
DATABASE_URL   postgresql://postgres.lqlfciaelhmaozxwunun:[DB_PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require
DIRECT_URL     (identique à DATABASE_URL)
AUTH_SECRET    une longue chaîne aléatoire
APP_URL        https://<votre-domaine>.vercel.app
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Contrôle : `https://<domaine>/api/health` doit renvoyer `"ok": true`.

## Démarrage local

```bash
cp .env.example .env
# Ajuster DATABASE_URL si besoin
npx prisma migrate dev
npx prisma db seed
npm run dev
```

PostgreSQL 16 doit écouter sur `127.0.0.1:5432` (utilisateur `nera` / base `nera_beaute`).

## Comptes de démonstration (dev uniquement)

| Rôle | Email | Mot de passe |
|---|---|---|
| Super admin | `raisaodin1@gmail.com` | `NeraAdmin2026!` |
| Caisse | `caisse@nerabeaute.cm` | `Caisse2026!` |
| Stock | `stock@nerabeaute.cm` | `Stock2026!` |
| Cliente | `marie.client@example.com` | `Client2026!` |

## Surfaces

- Boutique : `/`
- Caisse : `/pos`
- Admin : `/admin`
- Connexion staff : `/login`

Le stock est **unique** : une vente POS ou une commande en ligne mouvemente le même inventaire, en transaction.

Les paiements Mobile Money / carte en ligne sont saisis manuellement pour l’instant (adaptateur prêt, pas de faux prestataire).
