# Atlas Auto Morocco

Plateforme e-commerce **production-oriented** pour accessoires automobile au Maroc : **MAD**, **livraison par zone**, **paiement à la livraison par défaut**, **fraude / validation manuelle**, **loyalty**, **affiliation**, **WhatsApp**, structure **Stripe / CMI**.

## Architecture (résumé)

- **Frontend** : Next.js 16 (App Router), Tailwind CSS 4, Framer Motion, `next-intl` (FR + AR + RTL), PWA manifest.
- **Backend** : NestJS 11, Prisma 6, PostgreSQL, JWT + refresh, rôles `CUSTOMER` / `ADMIN`.
- **Données** : schéma complet dans `backend/prisma/schema.prisma` (indexes inclus).
- **Déploiement cible** : Vercel (web) · Railway / Render (API) · Neon / Supabase (Postgres).

Documentation détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Prérequis

- Node.js 20+ (22 recommandé)
- Docker (optionnel, pour Postgres local)

## Démarrage rapide

### 1. Base de données

```bash
docker compose up -d postgres
```

Copiez `backend/.env.example` vers `backend/.env` et ajustez `DATABASE_URL`, par exemple :

```env
DATABASE_URL="postgresql://postgres:1606@localhost:5432/WEBWEB?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_SEC=900
JWT_REFRESH_EXPIRES_DAYS=7
FRONTEND_URL=http://localhost:3000
```

### 2. API (NestJS)

```bash
cd backend
npm install
```

Créez les **tables** dans votre base (obligatoire sur une base vide ou erreur *Internal server error* / Prisma `P2021`) :

```bash
# À la racine du dépôt (recommandé) :
npm run db:push
npm run db:seed

# ou depuis backend/ :
npx prisma db push
npm run db:seed
```

Puis pour lancer l’API seule : `npm run start:dev` dans `backend/`.

- Swagger : http://localhost:4000/api/docs  
- Health : http://localhost:4000/api/health  

### 3. Site + API (une commande)

À la **racine du dépôt** (pas dans `frontend/` seul) :

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm run dev
```

Cela lance **Nest sur le port 4000** et **Next sur le 3000** en même temps. L’URL : http://localhost:3000 (redirige vers `/fr`).

Pour **seulement** le site (sans API / sans admin) : `npm run dev:frontend`.

Pour **seulement** l’API : `npm run dev:backend`.

### Comptes seed

| Rôle     | Téléphone      | Mot de passe   |
|----------|----------------|----------------|
| Admin    | +212600000001  | `Admin123!`    |
| Client   | +212612345678  | `Customer123!` |

## Variables d’environnement (extraits)

**Backend** : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_SEC`, `JWT_REFRESH_EXPIRES_DAYS`, `FRONTEND_URL`, `SMTP_*`, `WHATSAPP_*`, `STRIPE_SECRET_KEY`, `LOYALTY_POINTS_PER_10_MAD`.

**Frontend** : `NEXT_PUBLIC_API_URL`.

## API — exemples (`curl`)

Remplacez `TOKEN` par un JWT (`accessToken` retourné au login).

```bash
# Produits (public)
curl -s "http://localhost:4000/api/products?sort=popular&take=8"

# Checkout invité — COD, téléphone marocain, zone CASA
curl -s -X POST http://localhost:4000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"productId":"<ID_PRODUIT>","quantity":1}],
    "paymentMethod":"CASH_ON_DELIVERY",
    "firstName":"Karim",
    "lastName":"Benali",
    "guestEmail":"karim@example.com",
    "phoneConfirmed":false,
    "shipping":{
      "line1":"12 rue test",
      "quarter":"Maarif",
      "cityCode":"CASA",
      "phone":"0612345678"
    }
  }'

# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+212612345678","password":"Customer123!"}'

# Dashboard admin (JWT admin)
curl -s http://localhost:4000/api/admin/dashboard \
  -H "Authorization: Bearer TOKEN"
```

## Fonctionnalités Maroc / risque

- **COD** par défaut, statuts `PENDING_CONFIRMATION` si confirmation téléphone / risque.
- **Fraud flags** : doublons de téléphone, noms suspects, panier première commande à forte valeur — `manualConfirmationRequired` + dossier admin.
- **WhatsApp** : lien `wa.me` (config `WHATSAPP_PHONE_E164`) + hook Cloud API prêt dans `NotificationsService`.
- **Zones** : modèle `DeliveryZone` (ex. `CASA`, `RABAT`) avec frais et seuil livraison offerte.

## Tests & qualité

- Backend : `cd backend && npm test` (ex. `fraud.service.spec.ts`).
- Optimisation : activer cache Redis (à ajouter), CDN images, monitoring Sentry — décrits dans `docs/ARCHITECTURE.md`.

## Structure du dépôt

```text
backend/        # NestJS + Prisma
frontend/       # Next.js
docs/           # Architecture
docker-compose.yml
.github/workflows/ci.yml
```

---

Projet généré pour une approche **startup** : priorités conversion (preuve sociale, stock bas, sticky mobile, upsell), conformité locale (MAD, COD, villes), et **sécurisation des commandes** via file d’attente fraud + décision admin.
