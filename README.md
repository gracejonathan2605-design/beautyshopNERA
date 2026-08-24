# NERA Beauté & Shop

Système unique (boutique en ligne + POS + administration) pour **NERA Beauté & Shop**, Yaoundé, Cameroun. Devise : **FCFA**.

## Stack

Next.js 16 · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Auth JWT httpOnly · Zod

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
