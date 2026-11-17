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

Le build Vercel compile l’application et génère le client Prisma; il ne modifie plus la base. Appliquer les migrations séparément depuis un environnement de déploiement sécurisé, avant de promouvoir la version applicative :

```bash
npm run db:deploy
npm run db:catalog -- --soft
```

Les migrations doivent rester compatibles avec la version actuellement déployée (ajout/extension d’abord, suppression ultérieure). `db:deploy` échoue si les migrations ne peuvent pas être appliquées; un build réussi ne signifie pas que la base a été migrée. Si Vercel affiche **Ready** mais le site est blanc ou 404 :

1. **Protection des déploiements** : Settings → Deployment Protection → désactiver *Vercel Authentication* (Preview **et** Production) si la boutique doit être publique.
2. **Domaine de production** : Settings → Domains → assigner le domaine au dernier déploiement Production.
3. **Variables d’environnement** (Production + Preview) puis Redeploy : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

Optionnel : `AI_GATEWAY_API_KEY` en local pour les **suggestions de description** à partir des photos produit. Sur Vercel, l’OIDC du projet suffit. La suggestion n’est jamais écrite toute seule : le personnel peut la modifier puis l’utiliser, ou l’ignorer.

Le cron des commandes impayées tourne **une fois par jour** (03:00 UTC) : le plan Hobby Vercel refuse les crons horaires et **bloque alors tout déploiement**. Il exige `CRON_SECRET` (Vercel envoie `Authorization: Bearer $CRON_SECRET`) ; sans cette variable le cron répond 401 et le stock des commandes jamais payées n’est pas libéré.

Contrôle : `https://<domaine>/api/health` doit renvoyer `"ok": true` et `"db": "ok"` (la base est réellement interrogée). La réponse liste aussi les réglages manquants (`CRON_SECRET`, Storage, Orange Money).

## Checklist de mise en service (à faire une fois)

1. **Base** : `DATABASE_URL` / `DIRECT_URL` renseignées ; appliquer `npm run db:deploy` avant de promouvoir un déploiement.
2. **Comptes staff** : `npx prisma db seed` depuis un poste avec le `.env` de production (variables `SEED_*`). Changer ensuite les mots de passe dans Admin → Utilisateurs. Le seed n’affiche jamais les mots de passe.
3. **Photos** : `npm run supabase:setup` (crée le bucket `product-images`) puis exécuter `supabase/rls.sql` dans l’éditeur SQL Supabase.
4. **Sécurité** : `AUTH_SECRET` long et aléatoire (`openssl rand -base64 48`), `CRON_SECRET` différent.
5. **Orange Money** : sans les variables `ORANGE_MONEY_*`, la boutique propose le **code marchand** (paiement manuel) et le personnel confirme le paiement dans Admin → Commandes. Avec les variables, le push Orange est envoyé automatiquement ; le webhook `/api/payments/orange?k=…` est signé par `ORANGE_MONEY_WEBHOOK_SECRET` (ou `AUTH_SECRET`).
6. **MTN MoMo** : paiement manuel par défaut (code marchand). Le webhook `/api/payments/momo` exige l’en-tête `x-payment-secret: $PAYMENT_WEBHOOK_SECRET`, ainsi qu’un payload `orderNumber`, `status: "COMPLETED"` et `amount` entier exactement égal au total de la commande. Il ne valide qu’un paiement MTN encore en attente; le verrou transactionnel du paiement rend les notifications répétées idempotentes. Le contrat de signature propre au fournisseur n’étant pas configuré dans l’application, ne pas exposer cette route sans le secret partagé et un fournisseur de confiance.
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

## Mesures de performance

Avant de modifier les index ou la recherche, mesurer les latences p50/p95 du catalogue sur une base de préproduction :

```bash
PERF_ALLOW_READONLY_DB=true npm run measure:catalog
```

Le protocole de mesure mobile (Lighthouse, routes et métriques à comparer) est dans [`docs/performance-measurement.md`](docs/performance-measurement.md).

## Surfaces

- Boutique : `/`
- Caisse : `/pos`
- Admin : `/admin`
- Connexion staff : `/login`

En caisse, choisissez un rayon puis, si nécessaire, un sous-rayon. Les articles du rayon et de ses sous-rayons sont affichés par pages ; utilisez « Voir les articles suivants » pour parcourir la suite. « Tous les articles » inclut aussi ceux sans rayon. La recherche par nom, référence (SKU) ou partie du code-barres porte sur tous les rayons ; précisez-la si 30 résultats s'affichent. Les photos, variantes et stocks facilitent l'identification. Le mode scan exige un code-barres ou une référence exacte et signale les codes-barres en double.

Le stock est **unique** : une vente POS ou une commande en ligne mouvemente le même inventaire, en transaction.

Les paiements Mobile Money / carte en ligne sont saisis manuellement pour l’instant (adaptateur prêt, pas de faux prestataire).

Les limites de tentatives de connexion, commande et paiement sont stockées dans PostgreSQL sous forme de compteurs atomiques à fenêtre glissante, avec une clé hachée et un nettoyage quotidien par le cron. En cas d’indisponibilité de la base, les actions protégées sont limitées par défaut (pas de contournement mémoire).
