# iVOD Mobile — Application Expo (React Native)

Application **viewer** complète pour iOS et Android, alignée sur l’API NestJS et le design web iVOD.

## Prérequis

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/) (`npx expo`)
- **Expo SDK 54** (compatible avec **Expo Go** actuel sur iOS/Android)
- API IVOD en marche (`make dev-up` à la racine du monorepo)
- Simulateur iOS / émulateur Android ou appareil physique avec **Expo Go**

## Installation

```bash
# À la racine du monorepo
npm install

cd apps/mobile
cp .env.example .env
# Adapter EXPO_PUBLIC_API_URL (voir ci-dessous)
```

### URL de l’API selon l’environnement

| Contexte | `EXPO_PUBLIC_API_URL` |
|----------|------------------------|
| iOS Simulator | `http://localhost:3000/api/v1` |
| Android Emulator | `http://10.0.2.2:3000/api/v1` |
| Appareil physique (même Wi‑Fi) | `http://<IP-de-votre-Mac>:3000/api/v1` |

## Lancer l’app

```bash
# Depuis la racine
make mobile-dev

# Ou
cd apps/mobile && npm run dev
```

Puis scanner le QR code avec **Expo Go**, ou `i` (iOS) / `a` (Android) dans le terminal.

## Fonctionnalités implémentées (parité viewer web)

### Catalogue
- Accueil : bannières, tendances, raccourcis catalogue
- Pages dédiées : Films, Séries, Web-séries, Documentaires, Animation (`/catalog/[type]`)
- Explorer / browse (filtres type + tri + recherche)
- Recherche + filtres
- Tarifs publics (`/pricing`)
- Live : liste + lecteur (`/live`, `/live/[id]`)
- Recommandations (`/recommendations`)
- Créateurs suivis (`/following`)

### Fiche contenu
- Synopsis, badges, créateur, favori, téléchargement, signalement
- Saisons & épisodes (séries)
- Reprise lecture (« Continuer »)
- Bande-annonce (modal)
- Distribution (cast → fiche personne)
- Récompenses, contenus similaires
- Commentaires & avis

### Lecture
- HLS / MP4 offline, pubs AVOD (`AdOverlay`), PIN parental
- Reprise position (`watch-sessions` + seek)
- Progression sauvegardée

### Auth & profils
- Login MDP / OTP, register, forgot / reset / setup password
- Multi-profils : sélection, création, édition (long press), PIN

### Compte & réglages
- Mon profil (prénom/nom), abonnement Paystack, historique, téléchargements
- Notifications, appareils, historique connexions
- Remboursements, contrôle parental, confidentialité (RGPD, export, suppression compte)
- Sécurité (changement MDP)

### Design (parité web viewer — premium)
- Police **Rajdhani**, tokens `colors` / `layout` / `shadows`
- **PageCanvas** + **AmbientOrbs** (halos home/pricing)
- **HomeHero** — hero cinéma accueil (dégradés, CTA Lecture)
- **ContentHero** — bannière + barre d’actions type Prime (chips, reprise, play blanc séries)
- **PlanCard** — tarifs avec badge Populaire, features, CTA dégradé
- **BrandLogo** (`assets/logo/logo_sans_fond.png`, copié du web)
- **AuthShell** — formulaires auth centrés H/V + logo + panneau glass
- **CatalogHero**, **PageHeader**, **SectionHeader**, **FilterPill**, **MetaChip**
- **SettingsShell** / **SettingsPanel** — abonnement via `PlanCard` embedded
- Créateur / fiche contenu : headers masqués, layout plein écran
- **Toasts** : `toast.success/error/warning/info` + `IvodToast` (style web)

## Structure du projet

```
apps/mobile/
├── app/                    # Expo Router (écrans)
│   ├── (auth)/             # login, register, forgot-password
│   ├── (profiles)/         # sélection profil
│   ├── (tabs)/             # accueil, recherche, favoris, téléchargements, profil
│   ├── content/[id].tsx    # fiche contenu
│   ├── watch/[id].tsx      # lecteur plein écran
│   ├── creator/[id].tsx
│   ├── settings/           # abonnement, historique, appareils, sécurité
│   └── notifications.tsx
├── src/
│   ├── theme/              # couleurs, espacements
│   ├── lib/
│   │   ├── api/            # client HTTP + endpoints
│   │   ├── device-registration.ts
│   │   ├── push-notifications.ts
│   │   └── offline-storage.ts
│   ├── store/              # auth, profil actif
│   └── components/         # UI + cartes contenu + PushBootstrap
└── MOBILE.md
```

## Assets (icônes)

Ajoutez dans `apps/mobile/assets/` :
- `icon.png` (1024×1024)
- `splash.png`
- `adaptive-icon.png` (Android)
- `notification-icon.png` (optionnel)

En attendant, Expo peut utiliser des placeholders — copiez le logo depuis `apps/web/public/logo/`.

## Builds production

```bash
npm run build:ios      # EAS Build
npm run build:android
```

Configurez `eas.json` et les identifiants `ci.ivod.app` dans `app.json`.

## Hors scope mobile (web uniquement)

- **Admin** et **Studio** créateur (upload, analytics studio, modération back-office)
- Téléchargement HLS segment-par-segment complet
- Compte à rebours « épisode suivant » avancé (UI simplifiée)
- Deep link callback Paystack dédié (sync manuel après navigateur)

## Dépannage

- **Network request failed** → vérifiez `EXPO_PUBLIC_API_URL` et que l’API écoute sur `0.0.0.0` (Docker : port 3000 mappé).
- **401 après login** → vérifiez que le seed a des utilisateurs ; testez `/auth/login` via Swagger.
- **Vidéo ne démarre pas** → contenu doit être `PUBLISHED` avec pipeline vidéo `READY` ; tester `/videos/:id/stream` avec le même JWT.
