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

- **Postgres** : Prisma via le pooler **transaction** (port 6543, `pgbouncer=true`). Le mode session (port 5432) plafonne à 15 clients et fait échouer le panier sous charge ; le code bascule d’ailleurs automatiquement un pooler `:5432` vers `:6543`.
- **Storage** : bucket public `product-images` (photos catalogue, compressées en WebP à l’envoi)
- **Auth GoTrue** : non utilisé pour le staff (JWT httpOnly). Les clés anon / service_role servent à Storage.

URI type (valeurs dans `.env`, jamais ici — Dashboard Supabase → Connect) :

```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

`DIRECT_URL` (hôte direct) ne sert qu’aux migrations Prisma.

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
3. **Variables d’environnement** (Production + Preview) puis Redeploy : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

Optionnel : `AI_GATEWAY_API_KEY` en local pour les **suggestions de description** à partir des photos produit. Sur Vercel, l’OIDC du projet suffit. La suggestion n’est jamais écrite toute seule : le personnel peut la modifier puis l’utiliser, ou l’ignorer.

Le cron des commandes impayées tourne **une fois par jour** (03:00 UTC) : le plan Hobby Vercel refuse les crons horaires et **bloque alors tout déploiement**. Il exige `CRON_SECRET` (Vercel envoie `Authorization: Bearer $CRON_SECRET`) ; sans cette variable le cron répond 401 et le stock des commandes jamais payées n’est pas libéré.

Contrôle : `https://<domaine>/api/health` doit renvoyer `"ok": true` et `"db": "ok"` (la base est réellement interrogée). La réponse liste aussi les réglages manquants (`CRON_SECRET`, Storage, Orange Money).

## Checklist de mise en service (à faire une fois)

1. **Base** : `DATABASE_URL` / `DIRECT_URL` renseignées ; le build Vercel applique les migrations (`scripts/migrate-deploy.ts`).
2. **Comptes staff** : `npx prisma db seed` depuis un poste avec le `.env` de production (variables `SEED_*`). Changer ensuite les mots de passe dans Admin → Utilisateurs. Le seed n’affiche jamais les mots de passe.
3. **Photos** : `npm run supabase:setup` (crée le bucket `product-images`) puis exécuter `supabase/rls.sql` dans l’éditeur SQL Supabase.
4. **Sécurité** : `AUTH_SECRET` long et aléatoire (`openssl rand -base64 48`), `CRON_SECRET` différent.
5. **Orange Money** : sans les variables `ORANGE_MONEY_*`, la boutique propose le **code marchand** (paiement manuel) et le personnel confirme le paiement dans Admin → Commandes. Avec les variables, le push Orange est envoyé automatiquement ; le webhook `/api/payments/orange?k=…` est signé par `ORANGE_MONEY_WEBHOOK_SECRET` (ou `AUTH_SECRET`).
6. **MTN MoMo** : paiement manuel par défaut (code marchand). Le webhook `/api/payments/momo` n’accepte que l’en-tête `x-payment-secret: $PAYMENT_WEBHOOK_SECRET`.
7. **Alertes WhatsApp équipe** : Green API (`GREEN_API_ID`, `GREEN_API_TOKEN`, `ORDER_WHATSAPP_TO`, ou les mêmes champs dans Admin → Paramètres). Sans cela, aucune alerte mais le site fonctionne.
8. **Paramètres boutique** : Admin → Paramètres (code marchand Orange, compte MTN, délai des commandes impayées, pied de ticket, mentions légales NUI/RCCM).
9. **Vérification finale** : `/api/health`, connexion `/login`, ouverture de caisse `/pos`, une commande test depuis la boutique jusqu’à `/commande/[numéro]`.

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
