# Atlas Auto Morocco

Plateforme e-commerce **production-oriented** pour accessoires automobile au Maroc : **MAD**, **livraison par zone**, **paiement à la livraison par défaut**, **fraude / validation manuelle**, **loyalty**, **affiliation**, **WhatsApp**, structure **Stripe / CMI**.

## Architecture (résumé)

- **Frontend** : Next.js 16 (App Router), Tailwind CSS 4, Framer Motion, `next-intl` (FR + AR + RTL), PWA manifest.
- **Backend** : NestJS 11, Prisma 6, PostgreSQL, JWT + refresh, rôles `CUSTOMER` / `ADMIN`.
- **Données** : schéma complet dans `prisma/schema.prisma` (indexes inclus).
- **Déploiement cible** : Vercel (web) · Railway / Render (API) · Neon / Supabase (Postgres).

Documentation détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Déploiement Vercel (frontend)

Dans le projet Vercel, définir **Root Directory** sur `frontend` (Settings → General → Root Directory). Le dépôt contient aussi l’API Nest à la racine (`server/`, `prisma/`, `package.json`) : sans ce réglage, Vercel tente une détection « serveur Node » sur la racine et échoue avec *No entrypoint found*. L’API se déploie séparément (ex. Railway). **Production** (ex. `dabashop.store`) : ne merger sur `main` qu’après validation locale ou sur **preview** ; variables d’environnement Production sur Vercel pointent vers l’API Railway, jamais vers `localhost`.

## Prérequis

- Node.js 20+ (22 recommandé)
- Docker (optionnel, pour Postgres local)

## Démarrage rapide

### 1. Base de données

```bash
docker compose up -d postgres
```

Copiez `.env.example` vers `.env` à la **racine du dépôt** et ajustez `DATABASE_URL`, par exemple :

```env
DATABASE_URL="postgresql://postgres:1606@localhost:5432/WEBWEB?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_SEC=900
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000,http://127.0.0.1:3000"
PORT=4000
```

### 2. API (NestJS) — racine du dépôt

```bash
npm install
```

Créez les **tables** dans votre base (obligatoire sur une base vide ou erreur *Internal server error* / Prisma `P2021`) :

```bash
npm run db:push
npm run db:seed
```

Puis lancer l’API en mode développement :

```bash
npm run start:dev
```

- API : **http://localhost:4000** (défaut ; surcharger avec `PORT=3001` si besoin)  
- Swagger : http://localhost:4000/api/docs  
- Préfixe global : `/api/…`

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

- App : **http://localhost:3000** (locale par défaut : `/fr`)

Depuis la **racine**, raccourcis :

```bash
npm run dev:backend    # Nest --watch (port 4000 par défaut)
npm run dev:frontend   # Next dev sur le port 3000
```

Utilisez **deux terminaux** : backend d’abord (ou en parallèle), puis frontend. Sans API locale, Next affichera des erreurs de proxy vers `127.0.0.1:4000`.

**Connexion front → API locale** : le navigateur appelle `/api-proxy/…`. Sans variable, Next réécrit vers `http://127.0.0.1:4000/api/…`. Si l’API tourne sur un autre port, créez `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
```

Puis redémarrez `npm run dev` dans `frontend/`. Voir `frontend/.env.example`.

## Workflow Git & environnements (ne pas casser la prod)

1. Créer une branche : `git checkout -b dev` (ou `feature/…`).
2. Développer et tester **localement** (API + Next).
3. Pousser la branche → **Vercel** génère une **Preview** (URL dédiée) : vérifier l’UI sans impacter le domaine production.
4. Merger vers `main` uniquement quand c’est validé ; Vercel déploie alors la **Production** (ex. `dabashop.store`).

### Comptes seed

| Rôle     | Téléphone      | Mot de passe   |
|----------|----------------|----------------|
| Admin    | +212600000001  | `Admin123!`    |
| Client   | +212612345678  | `Customer123!` |

## Variables d’environnement (extraits)

**Backend** : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_SEC`, `JWT_REFRESH_EXPIRES_DAYS`, `FRONTEND_URL`, `RESEND_API_KEY` + `RESEND_FROM` (email on Railway Hobby) or `SMTP_*`, `ORDER_NOTIFICATION_EMAIL`, `WHATSAPP_*`, `STRIPE_SECRET_KEY`, `LOYALTY_POINTS_PER_10_MAD`.

**Frontend** : `NEXT_PUBLIC_API_URL` / `BACKEND_PROXY_URL` (rewrites `/api-proxy` vers l’API). En local, optionnel si l’API est sur `127.0.0.1:4000`.

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

- Backend : `npm test` à la racine (ex. `fraud.service.spec.ts`).
- Optimisation : activer cache Redis (à ajouter), CDN images, monitoring Sentry — décrits dans `docs/ARCHITECTURE.md`.

## Structure du dépôt

```text
server/         # Code source NestJS (bootstrap: server/main.ts)
prisma/         # Schéma Prisma, seed, scripts
frontend/       # Next.js (App Router, next-intl)
docs/           # Architecture
package.json    # Scripts API (racine)
docker-compose.yml
.github/workflows/ci.yml
```

---

Projet généré pour une approche **startup** : priorités conversion (preuve sociale, stock bas, sticky mobile, upsell), conformité locale (MAD, COD, villes), et **sécurisation des commandes** via file d’attente fraud + décision admin.
