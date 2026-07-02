@AGENTS.md

# iVOD Web — Architecture & Guide de Développement Complet

> Plateforme VOD africaine — Next.js 16 + React 19 + Tailwind CSS v4
> Marché cible : Afrique francophone / XOF (FCFA)
> API : `http://localhost:3000/api/v1` (dev) — `https://api.ivod.africa/api/v1` (prod)
> Swagger API : `http://localhost:3000/api/v1/docs`

---

## IMPORTANT — Next.js 16 & React 19

Next.js 16 a des breaking changes vs les versions précédentes.
Avant d'écrire du code, lis `node_modules/next/dist/docs/`.

Règles absolues :
- **App Router uniquement** (pas de pages/)
- **Server Components par défaut** — ajouter `'use client'` seulement si nécessaire
- **React 19** : `use()` hook, Server Actions, `useActionState`, `useOptimistic`
- **Tailwind CSS v4** : nouvelle syntaxe `@theme`, plus de `tailwind.config.js` classique

---

## 1. STACK TECHNOLOGIQUE

```
Framework       : Next.js 16 (App Router, Server/Client Components)
UI              : React 19
Styling         : Tailwind CSS v4 + CSS Variables (déjà configuré dans globals.css)
Composants      : shadcn/ui (installer via CLI — compatible Tailwind v4)
State global    : Zustand (auth, profil actif, player, UI)
State serveur   : TanStack Query v5 (cache, revalidation, infinite scroll, optimistic)
Forms           : React Hook Form + Zod (validation isomorphique)
HTTP Client     : fetch natif avec wrapper typé (~/lib/api/client.ts)
Video Player    : Video.js + videojs-contrib-hls (HLS streaming MinIO)
WebSocket       : Socket.io-client (notifications temps réel)
Notifications   : Sonner (toasts UI) + center notifications custom
SEO             : Next.js Metadata API (generateMetadata pour Server Components)
Dates           : date-fns avec locale fr-CI
Icônes          : Lucide React
Animations      : Framer Motion (carrousel hero, transitions, skeleton loaders)
Charts          : Recharts (analytics créateur/admin)
Upload          : Axios (suivi progression pour upload MinIO presigned URLs)
Infinite scroll : TanStack Query fetchNextPage
Virtualisation  : @tanstack/react-virtual (longues listes catalogue)
```

### Dépendances à installer

```bash
# Core UI & composants
pnpm add lucide-react class-variance-authority clsx tailwind-merge sonner framer-motion

# Initialiser shadcn/ui (interactif)
npx shadcn@latest init

# Data & State
pnpm add @tanstack/react-query @tanstack/react-query-devtools zustand

# Forms
pnpm add react-hook-form @hookform/resolvers zod

# Player
pnpm add video.js
pnpm add -D @types/video.js

# Networking
pnpm add socket.io-client axios

# Utils
pnpm add date-fns @tanstack/react-virtual recharts
```

---

## 2. ARCHITECTURE DES DOSSIERS

```
apps/web/
├── app/
│   ├── (public)/                     # Routes publiques (navbar + footer)
│   │   ├── layout.tsx                # Layout public
│   │   ├── page.tsx                  # Homepage (/)
│   │   ├── browse/
│   │   │   ├── page.tsx              # Catalogue avec filtres
│   │   │   └── [genre]/page.tsx      # Page d'un genre
│   │   ├── content/
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Fiche contenu (Server Component, SSR)
│   │   │       └── loading.tsx       # Skeleton loader
│   │   ├── creator/
│   │   │   └── [id]/page.tsx         # Profil public créateur
│   │   └── search/page.tsx           # Moteur de recherche
│   │
│   ├── (auth)/                       # Routes auth (layout centré, sans sidebar)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-otp/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── setup-password/page.tsx   # Lien invitation créateur
│   │
│   ├── (app)/                        # Routes protégées viewer
│   │   ├── layout.tsx                # Layout avec navbar auth
│   │   ├── profiles/
│   │   │   ├── page.tsx              # Sélection profil (post-login)
│   │   │   └── [id]/edit/page.tsx    # Édition profil
│   │   ├── watch/
│   │   │   └── [id]/page.tsx         # Player vidéo (Client Component)
│   │   ├── live/
│   │   │   └── [id]/page.tsx         # Live streaming player
│   │   ├── favorites/page.tsx
│   │   ├── history/page.tsx
│   │   ├── downloads/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/
│   │       ├── page.tsx              # Mon profil compte
│   │       ├── subscription/page.tsx # Abonnement + paiement Mobile Money
│   │       ├── devices/page.tsx      # Appareils connectés
│   │       ├── security/page.tsx     # Mot de passe, historique connexions
│   │       └── parental/page.tsx     # Contrôle parental par profil
│   │
│   ├── (studio)/                     # Dashboard créateur
│   │   ├── layout.tsx                # Sidebar studio
│   │   └── studio/
│   │       ├── page.tsx              # Dashboard (vues, revenus, followers)
│   │       ├── contents/
│   │       │   ├── page.tsx          # Mes contenus (liste)
│   │       │   ├── new/page.tsx      # Créer contenu
│   │       │   └── [id]/
│   │       │       ├── page.tsx      # Éditer contenu (métadonnées)
│   │       │       ├── upload/page.tsx  # Upload vidéo + pipeline status
│   │       │       └── cast/page.tsx    # Gérer cast & crew
│   │       ├── analytics/page.tsx    # Stats (vues, durée, completion rate)
│   │       └── revenue/page.tsx      # Revenus et statements
│   │
│   ├── (admin)/                      # Back-office administrateur
│   │   ├── layout.tsx                # Sidebar admin
│   │   └── admin/
│   │       ├── page.tsx              # Dashboard KPIs
│   │       ├── contents/page.tsx     # File de modération
│   │       ├── users/page.tsx        # Gestion utilisateurs
│   │       ├── creators/
│   │       │   ├── page.tsx          # Liste créateurs
│   │       │   └── new/page.tsx      # Créer compte créateur
│   │       ├── revenue/page.tsx      # Finance (statements)
│   │       ├── moderation/page.tsx   # Signalements + file
│   │       ├── banners/page.tsx      # Bannières homepage
│   │       ├── campaigns/page.tsx    # Campagnes marketing
│   │       └── references/page.tsx  # CRUD référentiels
│   │
│   ├── layout.tsx                    # Root layout (Providers + fonts)
│   ├── globals.css                   # Tailwind + CSS vars (existant)
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                           # shadcn/ui (auto-généré)
│   ├── layout/
│   │   ├── Navbar.tsx                # Nav principale (logo, search, user menu)
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx               # Sidebar studio/admin
│   │   └── MobileNav.tsx
│   ├── content/
│   │   ├── ContentCard.tsx           # Card catalogue (poster, titre, genres, badge plan)
│   │   ├── ContentCardSkeleton.tsx
│   │   ├── ContentGrid.tsx           # Grille responsive
│   │   ├── ContentRow.tsx            # Rangée horizontale scroll (Netflix-style)
│   │   ├── ContentHero.tsx           # Section hero fiche contenu
│   │   └── ContentBadges.tsx         # Badges (SVOD, 4K, EXCLUSIF, -12...)
│   ├── player/
│   │   ├── VideoPlayer.tsx           # Video.js HLS player
│   │   ├── PlayerControls.tsx        # Contrôles custom overlay
│   │   ├── EpisodeSelector.tsx       # Navigation épisodes (sidebar)
│   │   ├── QualitySelector.tsx       # 360p/480p/720p/1080p
│   │   └── SubtitleSelector.tsx      # Pistes sous-titres
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── OtpForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── profile/
│   │   ├── ProfileSelector.tsx       # Modal/page sélection profil (post-login)
│   │   ├── ProfileCard.tsx           # Card profil avec avatar
│   │   └── ParentalPinModal.tsx      # Modal saisie PIN parental
│   ├── search/
│   │   ├── SearchBar.tsx             # Input + autocomplete dropdown
│   │   └── SearchResults.tsx         # Grille résultats
│   ├── notifications/
│   │   ├── NotificationBell.tsx      # Icône + badge compteur non-lus
│   │   └── NotificationPanel.tsx     # Panel liste notifications
│   ├── payment/
│   │   ├── PlanCard.tsx              # Card plan (FREE/BASIC/PREMIUM + prix XOF)
│   │   ├── PaymentForm.tsx           # Formulaire Mobile Money (provider + numéro)
│   │   └── SubscriptionBadge.tsx     # Badge plan dans navbar
│   ├── studio/
│   │   ├── UploadZone.tsx            # Drag & drop vidéo (upload MinIO)
│   │   ├── UploadProgress.tsx        # Status pipeline (PROBING → READY)
│   │   ├── ContentForm.tsx           # Formulaire création/édition contenu
│   │   └── StatsChart.tsx            # Recharts pour analytics
│   └── admin/
│       ├── ModerationCard.tsx        # Card modération contenu
│       └── AdminStats.tsx            # KPIs dashboard
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Wrapper fetch (auth, base URL, error handling)
│   │   ├── auth.ts                   # Appels auth
│   │   ├── contents.ts               # Appels contenus
│   │   ├── videos.ts                 # Upload + streaming
│   │   ├── subscriptions.ts
│   │   ├── payments.ts
│   │   ├── profiles.ts
│   │   ├── watch.ts                  # WatchSessions + history
│   │   ├── search.ts
│   │   ├── notifications.ts
│   │   ├── creators.ts
│   │   ├── admin.ts
│   │   └── references.ts
│   ├── stores/
│   │   ├── auth.store.ts             # user, accessToken, refreshToken, isAuth
│   │   ├── profile.store.ts          # profil actif + liste profils
│   │   ├── player.store.ts           # sessionId, position, quality, isPlaying
│   │   └── ui.store.ts               # thème, sidebar, modals
│   ├── hooks/
│   │   ├── useAuth.ts                # login, logout, refresh, me
│   │   ├── useProfile.ts             # profil actif, switch profil
│   │   ├── useContents.ts            # React Query contenus
│   │   ├── useSubscription.ts        # plan actif + entitlement
│   │   ├── useNotifications.ts       # WebSocket + liste
│   │   ├── useWatchSession.ts        # start, heartbeat, end session
│   │   ├── useUpload.ts              # pipeline upload MinIO (axios progress)
│   │   └── useMediaQuery.ts          # breakpoints responsive
│   ├── utils/
│   │   ├── format.ts                 # formatXOF, formatDuration, formatDate
│   │   ├── entitlement.ts            # logique accès contenu côté client
│   │   └── assets.ts                 # assetUrl(objectKey, bucket) → URL MinIO
│   ├── config/
│   │   ├── api.ts                    # BASE_URL, timeouts
│   │   └── plans.ts                  # Constantes FREE/BASIC/PREMIUM
│   ├── providers/
│   │   ├── QueryProvider.tsx         # TanStack Query Provider
│   │   └── SocketProvider.tsx        # Socket.io context
│   └── socket.ts                     # Socket.io singleton
│
├── middleware.ts                     # Protection routes + redirections
├── next.config.ts                    # Images MinIO, headers sécurité
├── .env.local                        # Variables locales (à créer)
└── .env.example                      # Template variables
```

---

## 3. VARIABLES D'ENVIRONNEMENT

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000

# MinIO — construction URLs publiques pour assets
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
NEXT_PUBLIC_MINIO_ASSETS_BUCKET=ivod-assets
NEXT_PUBLIC_MINIO_VIDEOS_BUCKET=ivod-videos

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=iVOD
```

---

## 4. WRAPPER API — lib/api/client.ts

Toutes les réponses API suivent ce format :
```json
{ "success": true, "data": { ... }, "meta": { "total": 100, "page": 1, "limit": 20 } }
```

```typescript
// lib/api/client.ts
const BASE = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.message ?? 'Erreur réseau', err.code);
  }
  const json = await res.json();
  return json.data as T;
}

// Helper paginé
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

Toujours récupérer le token depuis le store Zustand (`useAuthStore.getState().accessToken`).  
Si 401 → tenter refresh → si refresh échoue → logout + redirect /login.

---

## 5. AUTHENTIFICATION COMPLÈTE

### Flux OTP (inscription)
```
1. POST /auth/send-otp    { email }          → OTP envoyé par email (10min TTL)
2. POST /auth/verify-otp  { email, otp }     → { accessToken, refreshToken, user }
```

### Flux Password (connexion)
```
POST /auth/login { email|phone, password } → { accessToken, refreshToken, user }
```

### Flux Reset Password
```
POST /auth/forgot-password { email }        → code de reset envoyé
POST /auth/reset-password  { email, token, newPassword } → succès
```

### Flux Invitation Créateur
```
GET  /auth/setup-password?token=XXX        → vérifier le token
POST /auth/setup-password { token, newPassword } → activer le compte
```

### Refresh token
```
POST /auth/refresh { refreshToken } → { accessToken, refreshToken }
JWT access: 15min | Refresh: 30j
```

### Stockage (Zustand persist)
```typescript
// auth.store.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens, user) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}
// Persister refreshToken dans localStorage via zustand/middleware persist
// accessToken : mémoire uniquement (reset au refresh page)
```

### MustChangePassword
Si API retourne `{ code: 'AUTH_MUST_CHANGE_PASSWORD' }` (status 403) → rediriger vers `/auth/setup-password`.

---

## 6. MIDDLEWARE DE PROTECTION

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/browse', '/content', '/search', '/creator', '/auth'];
const AUTH_ONLY = ['/watch', '/favorites', '/history', '/downloads', '/settings', '/profiles', '/notifications', '/live'];
const STUDIO_ONLY = ['/studio'];
const ADMIN_ONLY = ['/admin'];

export function middleware(request: NextRequest) {
  // Lire token depuis cookie ou header
  // Décoder JWT (sans vérification signature) pour lire rôles
  // Rediriger si non autorisé
}
```

---

## 7. PROFILS MULTI-UTILISATEURS

Max **5 profils** par compte. Le profil actif conditionne l'historique, les favoris, le contrôle parental.

### Endpoints
```
GET    /api/v1/profiles                    → liste des profils du compte
POST   /api/v1/profiles                    → créer (max 5) { name, isKids?, languageCode?, maturityRatingId?, pin? }
PATCH  /api/v1/profiles/:id               → modifier { name?, avatarUrl?, languageCode?, maturityRatingId?, pin? }
DELETE /api/v1/profiles/:id               → supprimer (interdit sur profil default)
POST   /api/v1/profiles/:id/set-default   → définir par défaut
```

### Flux post-login
```
1. Connexion → charger GET /profiles
2. Si plusieurs profils → afficher page /profiles (ProfileSelector)
3. Clic profil → si PIN requis → <ParentalPinModal />
4. Stocker profileId actif dans Zustand profile.store
5. Utiliser profileId dans tous les appels watch, favorites, likes, comments...
```

### Contrôle parental
```
GET    /api/v1/parental-controls/profiles/:profileId
PUT    /api/v1/parental-controls/profiles/:profileId
  Body: {
    maxMaturityRatingCode: 'ALL'|'-12'|'-16'|'-18',
    blockedGenreCodes: string[],
    restrictedHoursStart: 0-23,
    restrictedHoursEnd: 0-23,
    requirePin: boolean
  }
DELETE /api/v1/parental-controls/profiles/:profileId
```

---

## 8. CATALOGUE & DÉCOUVERTE

### Homepage (`/`)
```
1. GET /api/v1/banners?country=CI             → Hero carrousel (Framer Motion)
2. GET /api/v1/watch-sessions/history         → "Continuer à regarder" (si auth)
3. GET /api/v1/contents?sort=publishedAt&limit=20  → Nouveautés
4. GET /api/v1/search/trending                → Tendances
5. GET /api/v1/recommendations                → Personnalisées (si auth)
6. Pour chaque genre principal : GET /api/v1/contents?genre=ACTION&limit=20
```

### Catalogue (`/browse`)
```
GET /api/v1/contents
  Query params:
    type=FILM|SERIE|WEB_SERIE|DOCUMENTAIRE|ANIMATION
    genre=ACTION|DRAMA|...
    year=2024
    minRating=3
    sort=publishedAt|viewCount|averageRating
    page=1&limit=24
  Affichage: grille, infinite scroll (TanStack Query fetchNextPage)
```

### Fiche contenu (`/content/[id]`) — SERVER COMPONENT
```
GET /api/v1/contents/:id
  → title, description, shortDescription, genres, cast, crew, awards
  → mediaAssets (poster isPrimary, trailer)
  → contentStats (totalViews, averageRating, likeCount)
  → épisodes groupés par saison si SERIE
  → videoAsset.status (READY/PUBLISHED pour savoir si streamable)

GET /api/v1/contents/:id/entitlement  (si connecté)
  → { hasAccess: boolean, reason: 'SVOD'|'TVOD'|'AVOD'|'NOT_AVAILABLE'|'GEO_BLOCKED' }

GET /api/v1/watch-sessions/history    → pour afficher "Reprendre à Xmin"
```

**Bouton lecture selon entitlement :**
```
hasAccess=true + AVOD       → "Regarder" → /watch/:id
hasAccess=true + SVOD/TVOD  → "Regarder" → /watch/:id
hasAccess=false + SVOD      → "S'abonner à partir de 500 XOF/mois" → /settings/subscription
hasAccess=false + TVOD      → "Acheter — X FCFA" → flow paiement
GEO_BLOCKED                 → "Non disponible dans votre région" (grisé)
```

---

## 9. PLAYER VIDÉO (`/watch/[id]`) — CLIENT COMPONENT

### Flux complet de lecture
```
1. GET /api/v1/videos/:contentId/stream
   → { url: 'https://minio.../hls/assetId/master.m3u8?signature=...' }
   Pour épisode: GET /api/v1/videos/episodes/:episodeId/stream

2. POST /api/v1/watch-sessions
   Body: { contentId, episodeId?, deviceFingerprint?, quality? }
   → { id: sessionId }

3. Heartbeat toutes les 30s:
   PATCH /api/v1/watch-sessions/:sessionId/heartbeat
   Body: { currentPositionSec, quality? }

4. Fin (fermeture page, fin vidéo):
   PATCH /api/v1/watch-sessions/:sessionId/end
   Body: { finalPositionSec? }
```

### Vérification limite écrans (anti-partage)
```
GET /api/v1/watch-sessions/active → sessions actives
Si count >= maxScreens (FREE=1, BASIC=2, PREMIUM=4):
  → Modal "Vous utilisez X appareils simultanément"
  → Bouton "Déconnecter tous" → DELETE /api/v1/watch-sessions/terminate-all
```

### Contrôle parental avant lecture
```
1. Charger parentalControl du profil actif
2. Vérifier restrictedHoursStart/End → si heure bloquée → afficher message + bloquer
3. Vérifier maturityRating contenu vs maxMaturityRatingCode
4. Si requirePin=true et contenu restreint → <ParentalPinModal />
```

### Configuration Video.js
```typescript
const playerConfig = {
  sources: [{ src: streamUrl, type: 'application/x-mpegURL' }],
  fluid: true,
  responsive: true,
  playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
  html5: { vhs: { overrideNative: true } },
};
// Quality switching: videojs-resolution-switcher ou renditions API
// Reprendre position: player.currentTime(watchHistory.watchedSeconds)
```

### Séries — navigation épisodes
```
GET /api/v1/episodes/contents/:contentId → groupé par saison
Sidebar ou bottom sheet: liste épisodes avec thumbnail + titre + progression
```

### Pistes sous-titres & audio
```
GET /api/v1/contents/:id → inclut subtitleTracks (objectKey MinIO .vtt) + audioTracks
Ajouter au player: player.addTextTrack('subtitles', label, language, { src: subtitleUrl })
```

---

## 10. RECHERCHE

```
GET /api/v1/search?q=:query&type=FILM&genre=ACTION&page=1&limit=20
  → { items: Content[], total, page, limit }

GET /api/v1/search/autocomplete?q=:q
  → { suggestions: [{ id, title, slug, type, avatarObjectKey? }] } max 8

GET /api/v1/search/trending?period=24h
  → { trendingContents: Content[], trendingSearches: [{ query }] }

GET  /api/v1/search/history  → { items: [{ query, createdAt }] }
DELETE /api/v1/search/history → effacer
```

**SearchBar** : debounce 300ms → autocomplete → `router.push('/search?q=...')`.  
Page vide → afficher trending searches + trending contents.

---

## 11. ABONNEMENTS & PAIEMENTS MOBILE MONEY

### Plans (à afficher dans /settings/subscription)
```
GET /api/v1/subscriptions/plans
  → [{ code: 'FREE'|'BASIC'|'PREMIUM', label, priceFcfaMonthly, maxScreens,
       videoQuality, hasAds, hasExclusiveAccess }]

FREE    : 0 XOF/mois — 1 écran — SD — Avec pub
BASIC   : ~500-1000 XOF/mois — 2 écrans — HD — Sans pub
PREMIUM : ~1500-2000 XOF/mois — 4 écrans — FHD — Sans pub — Contenu exclusif
```

### Abonnement courant
```
GET /api/v1/subscriptions/me
  → { hasActiveSubscription, plan: 'FREE'|'BASIC'|'PREMIUM', planDetails, currentPeriodEnd }
```

### Souscrire
```
POST /api/v1/subscriptions
Body: { planCode: 'BASIC', providerCode: 'ORANGE_MONEY', phoneNumber: '+225XXXXXXXX' }
→ { subscriptionId, payment: { id, status: 'PENDING', redirectUrl? } }

POST /api/v1/payments/initiate
Body: { amount, currency: 'XOF', userSubscriptionId, phoneNumber, providerId }
→ { paymentId, transactionId, status: 'PENDING', redirectUrl? }
```

### Providers disponibles
```
ORANGE_MONEY  → Côte d'Ivoire, Sénégal, Mali...
WAVE          → Côte d'Ivoire, Sénégal
MTN_MONEY     → Cameroun, Ghana, Nigeria
MOOV_MONEY    → Burkina, Bénin, Togo
STRIPE        → Diaspora (carte bancaire)
PAYPAL        → Diaspora
```

### Flow UX paiement
```
1. Choisir plan → modal PlanCard
2. Saisir provider + numéro téléphone → <PaymentForm />
3. POST /payments/initiate → afficher "Paiement en cours..."
4. Si redirectUrl → popup/redirect vers checkout Orange/Wave
5. Polling GET /payments/:id toutes les 5s jusqu'à COMPLETED ou FAILED
6. Notification WebSocket PAYMENT_CONFIRMED → toast "Abonnement activé !"
7. Invalider cache subscription → recharger planDetails
```

### Annuler abonnement
```
PATCH /api/v1/subscriptions/:id/cancel
Body: { cancelAtPeriodEnd: true } → annule à la fin de la période
```

### Factures
```
GET  /api/v1/invoices              → liste factures
GET  /api/v1/invoices/:id          → détail
POST /api/v1/invoices/generate/:paymentId → générer PDF
```

---

## 12. WATCH HISTORY & FAVORIS

### Historique
```
GET    /api/v1/watch-sessions/history                 → profil default (paginated)
GET    /api/v1/watch-sessions/history/profile/:id     → profil spécifique
DELETE /api/v1/watch-sessions/history                 → effacer

Champs: contentId, episodeId, watchedSeconds, percentage, completed, lastWatchedAt
Affichage: grille cards avec barre de progression (percentage %)
```

### Favoris
```
GET    /api/v1/favorites               → liste (paginated)
POST   /api/v1/favorites/:contentId   → ajouter
DELETE /api/v1/favorites/:contentId   → retirer
```

Bouton cœur sur chaque ContentCard — optimistic update (Zustand ou TanStack Query mutation).

### Likes (toggle)
```
POST /api/v1/likes/:contentId → like si absent, unlike si présent
GET  /api/v1/likes/:contentId → { liked: boolean }
```

### Téléchargements offline
```
GET    /api/v1/downloads           → actifs (avec expiresAt)
POST   /api/v1/downloads           → { contentId, quality?: '480p'|'720p'|'1080p' }
DELETE /api/v1/downloads/:id      → supprimer
```

---

## 13. ENGAGEMENT SOCIAL

### Commentaires
```
GET    /api/v1/comments/contents/:contentId → liste (paginé, avec 5 premières réponses)
POST   /api/v1/comments/contents/:contentId → { body, parentId? }
PATCH  /api/v1/comments/:id                → { body } (own only)
DELETE /api/v1/comments/:id               → soft delete (own only)
```

### Avis (1-5 étoiles)
```
GET    /api/v1/reviews/contents/:contentId → liste avis
POST   /api/v1/reviews/contents/:contentId → { rating: 1-5, title?, body? } (upsert — 1 par profil)
DELETE /api/v1/reviews/contents/:contentId
```

### Signalement contenu
```
POST /api/v1/reports/contents/:contentId
Body: { reason: 'INAPPROPRIATE'|'SPAM'|'COPYRIGHT'|'MISINFORMATION'|'OTHER', description? }
```

### Follows créateurs
```
GET    /api/v1/follows                    → créateurs suivis
GET    /api/v1/follows/:creatorId/status → { following: boolean }
POST   /api/v1/follows/:creatorId        → suivre
DELETE /api/v1/follows/:creatorId        → unfollow
```

---

## 14. NOTIFICATIONS

### WebSocket (Socket.io — temps réel)
```typescript
// lib/socket.ts
import { io } from 'socket.io-client';
const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: accessToken },
  transports: ['websocket'],
  autoConnect: false,
});
socket.on('notification', (data) => { /* ajouter au store notifications */ });
```

### REST (liste + lecture)
```
GET /api/v1/notifications?page=1&limit=20 → [{ id, type, title, body, data, read, createdAt }]
PUT /api/v1/notifications/:id/read        → marquer lue
PUT /api/v1/notifications/read-all        → marquer toutes lues
```

### Types de notifications (et action au clic)
```
VIDEO_READY        → redirect /studio/contents/:id (créateur)
PAYMENT_CONFIRMED  → toast + redirect /settings/subscription
NEW_CONTENT        → redirect /content/:data.contentId
SUB_EXPIRING       → redirect /settings/subscription
NEW_FOLLOWER       → redirect /creator/:data.creatorId
COMMENT_REPLY      → redirect /content/:data.contentId#comments
```

---

## 15. APPAREILS & SÉCURITÉ

### Appareils
```
GET    /api/v1/devices              → liste appareils (deviceType, deviceName, lastSeenAt)
POST   /api/v1/devices              → enregistrer { deviceType, deviceName, os, osVersion, fingerprint? }
DELETE /api/v1/devices/:id         → révoquer
POST   /api/v1/devices/:id/push-token → { token, platform: 'ANDROID'|'IOS'|'WEB' }
```

### Historique connexions
```
GET /api/v1/devices/login-history → [{ ipAddress, userAgent, countryCode, success, createdAt }]
```

---

## 16. DASHBOARD CRÉATEUR (`/studio`)

### Vue d'ensemble
```
GET /api/v1/creators/me
  → { stageName, bio, avatarObjectKey, verified, subscriberCount, totalEarned }

GET /api/v1/analytics/creators/me?period=30d
  → stats: totalViews, totalWatchTimeSec, subscriberCount, totalEarned (FCFA)
  → topContents: [{ id, title, viewCount, completionRate }]
```

### Mes contenus
```
GET /api/v1/creators/me/contents?page=1&limit=20&status=PUBLISHED
  → liste avec status, viewCount, likeCount, publishedAt
```

### Créer/éditer contenu
```
POST /api/v1/contents
Body: {
  title, slug, description, shortDescription,
  contentTypeCode: 'FILM'|'SERIE'|...,
  genreIds: string[],
  visibilityCode: 'PUBLIC'|'SUBSCRIBERS_ONLY'|'PPV'|'PRIVATE',
  maturityRatingId,
  countryOfOriginId,
  originalLanguageId,
  releaseYear,
  duration (secondes),
  ppvPrice (FCFA, pour TVOD uniquement),
  tags: string[],
  primaryRightsholderId
}
→ { id, slug, status: 'DRAFT' }
```

### Upload vidéo (pipeline complet)
```
Étape 1 — Obtenir URL upload:
  POST /api/v1/videos/upload-url { contentId }
  → { uploadUrl, assetId, objectKey, bucket }

Étape 2 — Upload direct MinIO (axios avec Progress):
  PUT uploadUrl
  Headers: Content-Type: video/mp4 (ou codec source)
  onUploadProgress: (e) => setProgress(e.loaded / e.total * 100)

Étape 3 — Confirmer upload:
  PATCH /api/v1/videos/assets/:assetId/complete
  → { assetId, status: 'UPLOADED', message: 'Transcodage en cours' }

Étape 4 — Polling statut pipeline:
  GET /api/v1/videos/:contentId/status toutes les 5s
  Status: CREATED → UPLOADED(0%) → PROBING(25%) → TRANSCODING(55%) → PACKAGING(80%) → READY(100%)
  Afficher <UploadProgress /> avec barre et label

Étape 5 — Notification WebSocket:
  socket.on('notification') type=VIDEO_READY → arrêter polling + afficher succès
```

### Upload épisode
```
POST /api/v1/videos/episodes/upload-url { episodeId } → presigned URL
[Mêmes étapes 2-5 que contenu]
Poll: GET /api/v1/videos/episodes/:episodeId/status
```

### Cast & Crew
```
GET  /api/v1/people/contents/:contentId/cast → [{ personId, fullName, characterName, isMainCast }]
POST /api/v1/people/contents/:contentId/cast → { personId, characterName?, displayOrder, isMainCast }
DELETE /api/v1/people/cast/:castId

GET  /api/v1/people/contents/:contentId/crew → [{ personId, fullName, crewRole.label }]
POST /api/v1/people/contents/:contentId/crew → { personId, crewRoleId }
DELETE /api/v1/people/crew/:crewId

# Rechercher une personne existante ou créer:
GET  /api/v1/people?search=:name → autocomplete acteurs/équipe
POST /api/v1/people → { fullName, stageName?, biography?, birthDate?, nationality? }
```

### Media assets (thumbnails, posters)
```
POST /api/v1/media-assets/contents/:contentId/upload-url
Body: { assetType: 'THUMBNAIL'|'POSTER'|'BANNER'|'TRAILER', mimeType: 'image/jpeg' }
→ { uploadUrl, objectKey }
[Upload vers MinIO puis:]
POST /api/v1/media-assets/contents/:contentId
Body: { type: 'THUMBNAIL', objectKey, mimeType, width, height, isPrimary: true }
```

### Revenue (mes revenus)
```
GET /api/v1/revenue/me/statements?page=1
  → [{ periodStart, periodEnd, grossAmount, netDistributable, status: 'DRAFT'|'LOCKED'|'PAID', paidAt? }]
```

---

## 17. BACK-OFFICE ADMIN (`/admin`)

### Dashboard
```
GET /api/v1/admin/dashboard
  → { usersCount, creatorsCount, contentsCount, monthlyRevenue, pendingModerationCount }
  Charts: vues 7 derniers jours, revenus 12 derniers mois
```

### Modération contenus
```
GET /api/v1/admin/contents?status=PENDING_REVIEW&page=1
  → contenus en attente de validation

PUT /api/v1/admin/contents/:id/approve → approuver (status → PUBLISHED)
PUT /api/v1/admin/contents/:id/reject  → rejeter { reason: string }

GET /api/v1/moderation/queue?status=PENDING&page=1
PATCH /api/v1/moderation/queue/:id/assign   → s'assigner l'item
PATCH /api/v1/moderation/queue/:id/complete → marquer terminé

GET /api/v1/moderation/reports?status=PENDING&page=1
PATCH /api/v1/moderation/reports/:id
Body: { action: 'REVIEWED'|'DISMISSED'|'ACTIONED' }
```

### Gestion utilisateurs
```
GET /api/v1/admin/users?page=1&search=:q
  → [{ id, email, firstName, lastName, isActive, plan, createdAt }]

PUT /api/v1/admin/users/:id/toggle-active → activer/désactiver compte
```

### Gestion créateurs
```
GET /api/v1/admin/creators?page=1
POST /api/v1/admin/creators → créer compte créateur complet
  Body: { email, firstName, lastName, stageName, bio?, password?, sendInvite?: true }

PUT /api/v1/admin/creators/:id/verify      → badge vérifié
POST /api/v1/admin/creators/:id/resend-invite → renvoi email invitation
```

### Bannières éditoriales
```
GET    /api/v1/banners
  → toutes bannières (actives + inactives)

POST   /api/v1/banners
Body: {
  title, subtitle?,
  contentId?,
  imageObjectKey, linkUrl?,
  position (ordre affichage),
  isActive, startsAt?, endsAt?,
  targetPlanIds?: ['BASIC', 'PREMIUM'],
  countryIds?: ['CI', 'SN']
}

PATCH  /api/v1/banners/:id
DELETE /api/v1/banners/:id
```

### Finance
```
GET /api/v1/revenue/statements?status=LOCKED&page=1
POST /api/v1/revenue/calculate/:year/:month → déclencher calcul revenus mois
PATCH /api/v1/revenue/statements/:id/pay    → marquer payé
```

### Droits & Contrats
```
GET  /api/v1/rightsholders?page=1
POST /api/v1/rightsholders → { type, displayName, legalName, email, countryId }

GET  /api/v1/rights/contracts
POST /api/v1/rights/contracts → { rightsholderId, contractRef, startsAt, endsAt, revenueSharePct }

GET  /api/v1/rights/content-rights
POST /api/v1/rights/content-rights → { contentId, contractId, monetizationType, territoryCode, startsAt, endsAt, status }
```

### Geo-restrictions
```
GET  /api/v1/geo-restrictions/contents/:contentId
POST /api/v1/geo-restrictions/contents/:contentId → { isoCode: 'CI', mode: 'ALLOW'|'BLOCK', reason? }
DELETE /api/v1/geo-restrictions/contents/:contentId/:isoCode
```

### Référentiels (CRUD)
```
GET    /api/v1/references/:resource
POST   /api/v1/references/:resource → { code, label }
PATCH  /api/v1/references/:resource/:id → { label }
DELETE /api/v1/references/:resource/:id

Resources: genres, content-types, content-statuses, content-visibilities,
           maturity-ratings, user-roles, user-plans, subscription-statuses,
           payment-providers, payment-statuses, languages, countries, currencies,
           territory-codes, crew-roles, award-types, report-reasons, report-statuses,
           moderation-priorities, moderation-statuses, transaction-types,
           invoice-statuses, refund-statuses, media-asset-types, live-stream-statuses,
           campaign-types, security-log-actions, beneficiary-types,
           content-right-statuses, revenue-statement-statuses
```

---

## 18. LIVE STREAMING

```
GET  /api/v1/live            → streams SCHEDULED + LIVE (paginé)
GET  /api/v1/live/:id        → { title, streamKey, playbackUrl, status, viewerCount, scheduledStartAt }

[Créateur]
POST /api/v1/live            → créer { title, scheduledStartAt?, type?, ticketPriceFcfa? }
PATCH /api/v1/live/:id/start → démarrer (status → LIVE, startedAt=now)
PATCH /api/v1/live/:id/end   → terminer (status → ENDED)
```

Player live : HLS depuis `playbackUrl`.  
Badge rouge "EN DIRECT" animé (Framer Motion pulse).  
Compteur viewers : polling toutes les 30s sur GET /live/:id.

---

## 19. RÉFÉRENTIELS — UTILISATION DANS LE WEB

Ces données sont statiques ou quasi-statiques. Charger une fois avec `staleTime: Infinity`.

```typescript
// Utilisation dans selects, filtres, badges
GET /api/v1/references → tous les référentiels d'un coup

Usages:
- ref_genres          → filtres catalogue, formulaire contenu, badges genre
- ref_content_types   → filtres (Film, Série...), badges
- ref_maturity_ratings → sélecteur contrôle parental, badge contenu (-12, -16, -18)
- ref_user_plans      → PlanCard, badge plan navbar
- ref_payment_providers → formulaire paiement (icône provider)
- ref_languages       → sélecteur langue profil, sélecteur langue originale contenu
- ref_countries       → sélecteur pays créateur/rightsholder
- ref_crew_roles      → formulaire crew (réalisateur, compositeur...)
- ref_award_types     → formulaire récompenses
- ref_territory_codes → formulaire droits territoriaux
```

---

## 20. CONSTRUCTION URLS ASSETS MINIO

```typescript
// lib/utils/assets.ts
export function assetUrl(objectKey: string | null | undefined, bucket = 'ivod-assets'): string | null {
  if (!objectKey) return null;
  return `${process.env.NEXT_PUBLIC_MINIO_URL}/${bucket}/${objectKey}`;
}

// Exemples d'usage:
// Poster contenu: assetUrl(content.primaryPoster?.objectKey)
// Avatar créateur: assetUrl(creator.avatarObjectKey)
// Banner: assetUrl(banner.imageObjectKey)
// Sous-titres: assetUrl(track.objectKey, 'ivod-videos')
```

---

## 21. UTILITAIRES FORMATAGE

```typescript
// lib/utils/format.ts

// Montants XOF (jamais de centimes — entiers uniquement)
export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  // → "15 000 FCFA"
}

// Durée vidéo (secondes → "1h30" ou "45min")
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
  return `${m}min`;
}

// Date relative (date-fns fr)
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

// Nombre compact (vues)
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}
```

---

## 22. GESTION D'ERREURS

```typescript
// Pattern global:
// 1. TanStack Query: onError → toast Sonner
// 2. Mutations: try/catch → toast.error(err.message)
// 3. Pages: error.tsx Next.js pour les erreurs fatales
// 4. Player: Video.js error event → overlay "Erreur de lecture, réessayer"

// Codes d'erreur API communs:
// AUTH_001   → email/phone requis
// AUTH_003   → OTP invalide/expiré
// AUTH_007   → email déjà utilisé
// PROFILE_002 → maximum 5 profils
// PARENTAL_001 → contenu non autorisé (contrôle parental)
// PAYMENT_010 → provider inconnu
// CONTENT_001 → contenu introuvable
```

---

## 23. THEMING IVOD

```css
/* globals.css — variables à personnaliser */
@theme inline {
  --color-primary: oklch(0.65 0.25 45);      /* Orange chaud IVOD */
  --color-secondary: oklch(0.75 0.15 85);    /* Or/Doré africain */
  --color-accent: oklch(0.60 0.20 290);      /* Violet/indigo */
  --color-background: #08080f;               /* Quasi-noir (mode sombre) */
  --color-surface: #12121f;                  /* Cards, panels */
  --color-surface-hover: #1c1c2e;
  --color-border: rgba(255,255,255,0.08);
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
}
```

**Mode sombre par défaut** (streaming = environnement sombre).  
Dark/Light toggle optionnel — stocker dans `ui.store.ts`.

**Assets existants** :
- `/public/logo/logo_sans_fond.png` → logo navbar/splash
- `/public/hero/hero.png` → hero homepage

---

## 24. RESPONSIVE & ACCESSIBILITÉ

```
Grid catalogue : grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
ContentRow     : flex overflow-x-auto, snap-x, gap-4
Player         : plein écran sur mobile (aspect-video)
```

Accessibilité :
- `aria-label` sur tous les boutons icônes
- `role="status"` sur loaders
- Navigation clavier player: Espace=play/pause, ←→=seek 10s, M=mute, F=fullscreen
- `alt` sur toutes les images Next.js

---

## 25. ORDRE D'IMPLÉMENTATION (PHASES)

### Phase 1 — Core streaming ✅ COMPLÈTE (2026-05-16)
1. ✅ Setup initial: providers, middleware, lib/api/client, stores, hooks, composants de base
   - Deps installées, next.config, .env, globals.css thème iVOD
   - lib/api/* (client, auth, profiles, contents, videos, subscriptions, payments, watch, search, notifications, creators, favorites, references)
   - lib/stores/* (auth, profile, player, ui)
   - lib/providers/* (QueryProvider, SocketProvider), lib/socket.ts
   - lib/hooks/* (useAuth, useProfiles, useSubscription, useMediaQuery)
   - lib/utils/* (format, assets, entitlement), lib/config/* (api, plans)
   - components/layout/* (Navbar, Footer, MobileNav)
   - components/content/* (ContentCard, ContentRow, ContentGrid, ContentCardSkeleton, ContentHero, ContentBadges)
   - components/search/SearchBar, components/notifications/NotificationBell
   - middleware.ts, app/layout.tsx (root + providers)
2. ✅ Auth pages : login, register, verify-otp, forgot-password, reset-password, setup-password
3. ✅ Profiles : sélection profil post-login (ProfileCard, ProfileSelector, ParentalPinModal), PIN parental
   - app/(app)/layout.tsx (guard auth), /profiles, /profiles/[id]/edit
4. ✅ Homepage : hero banners (Framer Motion), rangées catalogue, tendances, recommandations, CTA abonnement
   - app/(public)/layout.tsx (Navbar+Footer), app/page.tsx + app/homepage-client.tsx
5. ✅ Browse : catalogue avec filtres type + tri + infinite scroll
   - app/(public)/browse/page.tsx
6. ✅ Content [id] : fiche contenu SSR + entitlement + loading skeleton
   - app/(public)/content/[id]/page.tsx (generateMetadata SSR)
   - app/(public)/content/[id]/content-detail-client.tsx
   - app/(public)/content/[id]/loading.tsx
7. ✅ Watch [id] : player vidéo HLS (Video.js) + sessions + heartbeat 30s + limite écrans
   - components/player/VideoPlayer.tsx, app/(app)/watch/[id]/page.tsx
8. ✅ Subscription : plans + paiement Mobile Money (Orange, Wave, MTN, Moov, Stripe) + polling statut
   - components/payment/PlanCard.tsx, components/payment/PaymentForm.tsx
   - app/(app)/settings/subscription/page.tsx
9. ✅ Notifications : bell + panel + WebSocket (Socket.io) + routing par type
   - components/notifications/NotificationPanel.tsx
   - app/(app)/notifications/page.tsx

### Phase 2 — Engagement utilisateur ✅ COMPLÈTE (2026-05-16)
10. ✅ `/favorites` + `/history` — grilles paginées, suppression optimiste, barre de progression
11. ✅ Likes + Commentaires + Avis sur /content/[id]
    - lib/api/comments.ts, likes.ts, reviews.ts, reports.ts
    - components/content/LikeButton.tsx (optimistic update), CommentSection.tsx (réponses imbriquées), ReviewForm.tsx (étoiles)
    - Intégrés dans content-detail-client.tsx + signalement contenu
12. ✅ `/search` — moteur + autocomplete + tendances + historique de recherche
    - app/(public)/search/page.tsx
13. ✅ `/settings` — layout sidebar + profil + sécurité + appareils
    - app/(app)/settings/layout.tsx (sidebar nav)
    - settings/page.tsx (profil), settings/security/page.tsx (mdp + historique connexions), settings/devices/page.tsx
14. ✅ `/settings/parental` — contrôle parental par profil (maturité, heures, PIN)
    - app/(app)/settings/parental/page.tsx

### Phase 3 — Creator Studio ✅ COMPLÈTE (2026-05-16)
15. ✅ Layout studio (sidebar créateur + guard CREATOR/ADMIN) + dashboard stats KPIs
    - app/(studio)/layout.tsx (sidebar, mobile top-bar, guard isCreator)
    - app/(studio)/studio/page.tsx (KPIs: vues, abonnés, revenus, temps regardé + chart + top contenus)
    - components/studio/StatsChart.tsx (Recharts AreaChart + BarChart)
    - lib/api/analytics.ts, revenue.ts, people.ts, media-assets.ts
16. ✅ /studio/contents liste + new + [id] édition + upload pipeline complet
    - app/(studio)/studio/contents/page.tsx (table avec filtres statut)
    - app/(studio)/studio/contents/new/page.tsx → redirige vers upload après création
    - app/(studio)/studio/contents/[id]/page.tsx (édition métadonnées, accès rapide upload/cast)
    - app/(studio)/studio/contents/[id]/upload/page.tsx (UploadZone → MinIO presigned → polling + WebSocket VIDEO_READY)
    - components/studio/ContentForm.tsx (genres multi-select, types, visibilité, PPV)
    - components/studio/UploadZone.tsx (drag & drop + validation taille)
    - components/studio/UploadProgress.tsx (étapes PROBING → TRANSCODING → PACKAGING → READY)
17. ✅ /studio/analytics (graphes vues + temps, top contenus, taux completion) + /studio/revenue (relevés mensuels brut/net/statut)
    - app/(studio)/studio/analytics/page.tsx
    - app/(studio)/studio/revenue/page.tsx
18. ✅ Cast & Crew management (recherche personne, ajout rôles, suppression)
    - app/(studio)/studio/contents/[id]/cast/page.tsx (tabs Cast/Crew, autocomplete, crewRoles depuis références)
    - lib/hooks/useDebounce.ts

### Phase 4 — Back-office Admin ✅ COMPLÈTE (2026-05-16)
19. ✅ Layout admin (sidebar + guard ADMIN) + dashboard KPIs + modération contenus + signalements
    - app/(admin)/layout.tsx (sidebar, mobile bar, guard isAdmin)
    - app/(admin)/admin/page.tsx (KPIs: users, créateurs, contenus, revenus mois + alertes + graphes)
    - app/(admin)/admin/contents/page.tsx (approve/reject avec modal raison)
    - app/(admin)/admin/moderation/page.tsx (tabs signalements/file, actions REVIEWED/DISMISSED/ACTIONED)
    - lib/api/admin.ts (toutes les API admin)
20. ✅ Gestion users + creators + banners
    - app/(admin)/admin/users/page.tsx (search, pagination, toggle actif/suspendu)
    - app/(admin)/admin/creators/page.tsx (liste, vérification badge, renvoi invitation)
    - app/(admin)/admin/creators/new/page.tsx (formulaire invitation créateur)
    - app/(admin)/admin/banners/page.tsx (CRUD bannières, toggle actif, modal inline)
21. ✅ Finance + référentiels CRUD
    - app/(admin)/admin/revenue/page.tsx (calcul revenus par mois, paiement relevés LOCKED)
    - app/(admin)/admin/references/page.tsx (sidebar resources, édition inline code/label, ajout/suppression)
    - lib/api/rightsholders.ts

### Phase 5 — Features avancées ✅ COMPLÈTE (2026-05-16)
22. ✅ `/live` listing + `/live/[id]` player streaming HLS
    - app/(public)/live/page.tsx (grilles LIVE/SCHEDULED/ENDED, badge animé Framer Motion, compteur viewers)
    - app/(app)/live/[id]/page.tsx (player HLS Video.js, états SCHEDULED/ENDED, refresh auto 30s)
    - lib/api/live.ts
23. ✅ `/downloads` — gestion offline (actifs vs expirés, suppression, qualité badge)
    - app/(app)/downloads/page.tsx, lib/api/downloads.ts
24. ✅ Recommandations + profil public créateur
    - app/(app)/recommendations/page.tsx (sections perso + tendances + nouveautés)
    - app/(public)/creator/[id]/page.tsx (avatar, bio, follow/unfollow optimistic, grille contenus)
25. ✅ Palmarès/awards sur fiches contenus
    - components/content/AwardsSection.tsx (winners dorés vs nominations, groupage)
    - Intégré dans content-detail-client.tsx entre crew et actions
