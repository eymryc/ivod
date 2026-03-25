# iVOD — Monorepo

> Plateforme de streaming dédiée au cinéma ivoirien et africain francophone.

---

## Structure

```
ivod/
├── apps/
│   ├── api/          # Backend NestJS + Prisma
│   ├── web/          # Frontend Next.js 14 (App Router)
│   └── mobile/       # Application Expo (React Native)
├── packages/
│   ├── types/        # Types TypeScript partagés
│   └── config/       # ESLint / Prettier / TS partagés
├── package.json      # Workspaces npm
└── turbo.json        # Pipeline Turborepo
```

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 15+ |
| Compte Supabase | Gratuit |
| Compte Mux | Starter |
| Compte CinetPay | Développeur |
| Compte Stripe | Test mode |

---

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone https://github.com/votre-org/ivod.git
cd ivod
npm install
```

### 2. Configurer les variables d'environnement

#### Backend (`apps/api/.env`)
```bash
cp apps/api/.env.example apps/api/.env
# Remplissez chaque variable dans apps/api/.env
#node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL (Supabase ou local) |
| `JWT_SECRET` | Secret JWT (min. 32 caractères) |
| `SUPABASE_URL` | URL de votre projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (pas la anon key) |
| `MUX_TOKEN_ID` | Token ID Mux |
| `MUX_TOKEN_SECRET` | Token Secret Mux |
| `MUX_SIGNING_KEY_ID` | Signing Key ID Mux (pour URLs signées) |
| `MUX_SIGNING_PRIVATE_KEY` | Clé privée Mux |
| `MUX_WEBHOOK_SECRET` | Secret webhook Mux |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `STRIPE_PRICE_PREMIUM` | Price ID Stripe plan Premium |
| `STRIPE_PRICE_PREMIUM_PLUS` | Price ID Stripe plan Premium+ |
| `CINETPAY_API_KEY` | API Key CinetPay |
| `CINETPAY_SITE_ID` | Site ID CinetPay |
| `UPSTASH_REDIS_URL` | URL Redis Upstash |
| `UPSTASH_REDIS_TOKEN` | Token Upstash |
| `RESEND_API_KEY` | Clé API Resend (emails) |
| `FRONTEND_URL` | URL du frontend (ex: http://localhost:3001) |

#### Frontend (`apps/web/.env.local`)
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Initialiser la base de données

```bash
cd apps/api

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev --name init

# (Optionnel) Ouvrir Prisma Studio
npx prisma studio
```

### 4. Lancer en développement

```bash
# Depuis la racine du monorepo — lance tout en parallèle
npm run dev

# Ou individuellement :
cd apps/api && npm run dev      # API sur http://localhost:3000
cd apps/web && npm run dev      # Web sur http://localhost:3001
cd apps/mobile && npm run dev   # Expo sur Expo Go
```

---

## Endpoints API principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/auth/send-otp` | Envoyer OTP par email |
| `POST` | `/api/v1/auth/verify-otp` | Vérifier OTP → JWT |
| `GET`  | `/api/v1/auth/me` | Profil connecté |
| `GET`  | `/api/v1/contents` | Catalogue paginé |
| `GET`  | `/api/v1/contents/:id` | Détail contenu |
| `GET`  | `/api/v1/contents/:id/episodes` | Épisodes d'une série |
| `POST` | `/api/v1/contents/:id/progress` | Sauvegarder progression |
| `POST` | `/api/v1/videos/upload-url` | URL d'upload Mux |
| `GET`  | `/api/v1/videos/:id/stream` | URL de stream signée |
| `POST` | `/api/v1/videos/downloads/:id` | Demander un téléchargement |
| `POST` | `/api/v1/subscriptions/checkout/cinetpay` | Paiement Mobile Money |
| `POST` | `/api/v1/subscriptions/checkout/stripe` | Paiement carte |
| `GET`  | `/api/v1/subscriptions/me` | Mon abonnement |
| `GET`  | `/api/v1/creators/me/analytics` | Analytics créateur |
| `POST` | `/api/v1/creators/register` | Créer un compte créateur |

---

## Déploiement

### API — Railway

```bash
npm install -g @railway/cli
railway login && railway init && railway link

# Variables d'environnement
railway variables set DATABASE_URL="..." JWT_SECRET="..." # etc.

# Build & deploy
railway up
```

### Web — Vercel

```bash
npm install -g vercel
cd apps/web && vercel --prod
```

Configurer dans le dashboard Vercel :
- `NEXT_PUBLIC_API_URL` → URL Railway de l'API
- `NEXT_PUBLIC_SUPABASE_URL` → URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Clé anon Supabase
- `NEXT_PUBLIC_STRIPE_KEY` → Clé publique Stripe

### Mobile — EAS (Expo)

```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure
eas build --platform all --profile production
```

---

## Architecture des modules NestJS

```
Auth      → OTP (Supabase) + JWT
Users     → Profil, historique, downloads
Contents  → Catalogue, épisodes, progression
Videos    → Upload Mux, stream signé, download offline
Creators  → Profil public, analytics dashboard
Subscriptions → CinetPay + Stripe + webhooks
Notifications → WebSocket Gateway (Socket.io)
```

---

## Roadmap MVP

- [ ] Auth OTP + JWT ✅
- [ ] Catalogue contenus + filtres ✅
- [ ] Lecteur HLS (web + mobile) ✅
- [ ] Upload vidéo Mux ✅
- [ ] Paiement CinetPay (Wave, Orange, MTN) ✅
- [ ] Paiement Stripe (diaspora) ✅
- [ ] Dashboard créateur + analytics ✅
- [ ] Notifications WebSocket ✅
- [ ] Mode offline mobile ✅
- [ ] CI/CD GitHub Actions
- [ ] Tests e2e
- [ ] Recherche Algolia
- [ ] Monitoring Sentry + PostHog

---

## Contrat API

Toutes les réponses suivent l'enveloppe :

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2024-11-15T10:23:45.123Z",
    "version": "v1"
  }
}
```

En cas d'erreur :
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_003",
    "message": "Code OTP invalide ou expiré"
  }
}
```

---

*iVOD · Guide Technique v2.0 · 2024 · Confidentiel*
