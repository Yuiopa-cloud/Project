# Atlas Auto Morocco — System Architecture

## 1. High-level architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Clients (PWA)                             │
│              Next.js 15 (App Router) — Vercel                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST + JWT
┌────────────────────────────▼────────────────────────────────────┐
│                     API Layer — NestJS                           │
│     Auth · Catalog · Orders · Fraud · Loyalty · Affiliates       │
│              Railway / Render (Node 20+)                         │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
    ┌────────▼────────┐             ┌────────▼────────┐
    │   PostgreSQL     │             │  Object storage  │
    │ Neon / Supabase │             │ (S3 / Vercel Blob)│
    └─────────────────┘             └───────────────────┘

Sidecars / integrations:
- Email: SMTP (Resend / SendGrid) or transactional provider
- WhatsApp: Business API or deep-link `wa.me` + webhook stub for future Cloud API
- Payments: COD (default) + Stripe + CMI adapter interface (placeholder)
```

## 2. Tech decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Framer Motion | SEO, RSC where useful, mobile-first, premium motion |
| i18n | `next-intl` | French + Arabic, locale routing, RTL via `dir` |
| API | NestJS 11 | Modularity, validation (class-validator), guards, scalable domains |
| ORM | Prisma 6 | Typed schema, migrations, indexes in one place |
| DB | PostgreSQL 16 | JSON for flexibility; full relational integrity for orders |
| Auth | JWT (access + refresh pattern ready), Passport Google optional | Stateless API; Morocco users often prefer phone/email |
| Cache (future) | Redis | Rate limits, sessions; compose service added when scaling |
| Deploy | Vercel + Railway/Render + managed Postgres | Matches startup path; Docker for local parity |

## 3. Domain boundaries

- **Catalog**: categories, products, inventory, recommendations (rule-based MVP).
- **Commerce**: cart (DB + guest token), checkout, coupons, delivery zones (MAD), COD default.
- **Trust & risk**: fraud flags (duplicate phone, suspicious name heuristics), `manualConfirmationRequired`, admin approve/reject.
- **Growth**: loyalty points, affiliate codes, abandoned cart records + email hook.
- **Comms**: order events → email templates + WhatsApp message builder (link or API).

## 4. Security

- Helmet, CORS allowlist, global ValidationPipe (whitelist).
- Throttler on auth and checkout.
- Argon2 password hashing.
- CSRF: same-site cookies if moving to cookie sessions; API JWT remains Authorization header (SPAs).
- XSS: React escaping; sanitize rich text if added later.

## 5. Observability (production checklist)

- Structured logging (pino recommended next step).
- Health module (`/health`) for orchestrators.
- Error tracking (Sentry) — wire via env in frontend/backend.

## 6. Repository layout

```text
/
├── docs/
├── backend/          # NestJS + Prisma
├── frontend/         # Next.js
├── docker-compose.yml
└── README.md
```

This document satisfies **Step 1**. The authoritative **Step 2** schema lives in `backend/prisma/schema.prisma`.
