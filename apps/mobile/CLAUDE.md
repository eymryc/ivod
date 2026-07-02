# iVOD Mobile — Guide Expo/React Native pour Claude

> Expo SDK 52 + React Native + Expo Router + TanStack Query v5 + Zustand
> Architecture : **Clean Architecture** (4 couches séparées)

---

## ARCHITECTURE — CLEAN ARCHITECTURE

```
apps/mobile/
├── app/                          # Expo Router — routes/écrans (couche présentation légère)
│   ├── _layout.tsx               # Root layout (QueryClient, Auth, Fonts, Providers)
│   ├── (auth)/                   # Flux authentification (login, register, OTP...)
│   ├── (tabs)/                   # Navigation principale (Home, Catalogue, Search, Profil)
│   ├── (profiles)/               # Sélection/gestion profils
│   ├── content/[id].tsx          # Fiche contenu
│   ├── watch/[id].tsx            # Player vidéo (fullScreenModal)
│   ├── settings/                 # Paramètres utilisateur
│   └── ...
│
└── src/
    ├── application/              # Couche APPLICATION — use cases (logique orchestration)
    │   └── use-cases/            # Ex: PlayContentUseCase.ts
    │
    ├── core/                     # Couche DOMAINE — entités, erreurs, constantes pures
    │   ├── entities/             # Types TypeScript du domaine (Content, Episode, Entitlement...)
    │   ├── errors/               # ApiError, AuthRequiredError, SessionExpiredError
    │   ├── constants/            # QueryKeys (React Query keys centralisées)
    │   ├── catalog/              # Logique catalogue (content-types, sections)
    │   └── pricing/              # Types et constantes de pricing XOF
    │
    ├── infrastructure/           # Couche INFRA — accès réseau, stockage, services externes
    │   ├── api/
    │   │   ├── client.ts         # Client HTTP (SecureStore, JWT, refresh automatique)
    │   │   ├── index.ts          # Export de tous les modules API
    │   │   └── modules/          # Un fichier par domaine API (auth.api.ts, content.api.ts...)
    │   └── services/             # Services externes (device.service, notification.service, offline...)
    │
    ├── presentation/             # Couche PRÉSENTATION — hooks, providers, utils UI
    │   ├── hooks/                # Hooks React Query (use-content-detail, use-watch-session...)
    │   ├── providers/            # ErrorBoundary
    │   └── utils/                # Helpers UI (navigation, toast, payment-status...)
    │
    ├── components/               # Composants React Native réutilisables
    │   ├── auth/                 # AuthShell
    │   ├── content/              # ContentCard, ContentHero, CommentsSection...
    │   ├── home/                 # HomeHero, PremiumOfferCard
    │   ├── layout/               # PageCanvas, PageHeader, SearchField, FilterPill...
    │   ├── player/               # AdOverlay, ParentalPinModal
    │   ├── pricing/              # PlanCard, PricingPlans, PricingFaq...
    │   ├── settings/             # SettingsPage, SettingsShell
    │   └── ui/                   # Button, Input, EmptyState, Screen, IvodToast
    │
    ├── store/                    # Zustand stores
    │   ├── auth.store.ts         # Session utilisateur (SecureStore)
    │   ├── profile.store.ts      # Profil actif (SecureStore)
    │   └── toast.store.ts        # Toasts globaux
    │
    ├── theme/                    # Design tokens (SEULE source de vérité visuelle)
    │   ├── colors.ts             # Palette iVOD (fond sombre, magenta, orange, doré)
    │   ├── typography.ts         # Familles de polices + tailles
    │   ├── spacing.ts            # Espacements (4, 8, 12, 16, 24, 32...)
    │   ├── shadows.ts            # Ombres iOS/Android
    │   └── layout.ts             # Constantes layout (padding écran, radius...)
    │
    └── hooks/                    # Hooks génériques partagés
        └── use-content-types.ts
```

---

## RÈGLES DES 4 COUCHES

| Couche | Peut importer | Ne peut PAS importer |
|---|---|---|
| `core/` | rien d'interne | tout le reste |
| `application/` | `core/`, `infrastructure/` | `presentation/`, composants |
| `infrastructure/` | `core/` | `presentation/`, composants, stores |
| `presentation/` | `core/`, `infrastructure/` | `application/` directement |
| `components/` | tout | — |
| `store/` | `infrastructure/` | composants |

---

## AJOUTER UNE NOUVELLE FEATURE

### 1. Entité (si domaine nouveau)
```typescript
// src/core/entities/ma-feature.entity.ts
export interface MaFeature {
  id: string;
  nom: string;
}
```

### 2. Module API infrastructure
```typescript
// src/infrastructure/api/modules/ma-feature.api.ts
import { api } from '../client';
import type { MaFeature } from '@/core/entities/ma-feature.entity';

export const maFeatureApi = {
  list: () => api.get<MaFeature[]>('/ma-feature'),
  getById: (id: string) => api.get<MaFeature>(`/ma-feature/${id}`),
  create: (data: Partial<MaFeature>) => api.post<MaFeature>('/ma-feature', data),
};
```

### 3. Query Keys
```typescript
// src/core/constants/query-keys.ts — ajouter :
maFeature: {
  all: () => ['ma-feature'] as const,
  detail: (id: string) => ['ma-feature', id] as const,
},
```

### 4. Hook de présentation
```typescript
// src/presentation/hooks/use-ma-feature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/core/constants/query-keys';
import { maFeatureApi } from '@/infrastructure/api/modules/ma-feature.api';

export function useMaFeatureList() {
  return useQuery({
    queryKey: QueryKeys.maFeature.all(),
    queryFn: maFeatureApi.list,
    staleTime: 60_000,
  });
}
```

### 5. Exporter depuis index.ts
```typescript
// src/infrastructure/api/index.ts — ajouter l'export
export { maFeatureApi } from './modules/ma-feature.api';

// src/presentation/hooks/index.ts — ajouter l'export
export { useMaFeatureList } from './use-ma-feature';
```

### 6. Écran
```typescript
// app/ma-feature/[id].tsx
import { useMaFeatureDetail } from '@/presentation/hooks';
import { PageCanvas } from '@/components/layout/PageCanvas';

export default function MaFeatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useMaFeatureDetail(id);
  return <PageCanvas>{/* ... */}</PageCanvas>;
}
```

---

## CLIENT HTTP (infrastructure/api/client.ts)

```typescript
import { api } from '@/infrastructure/api/client';

// GET authentifié (défaut)
const data = await api.get<Type>('/endpoint');

// POST public
const res = await api.post<Type>('/auth/login', body, false);

// GET avec token optionnel
const res = await api.get<Type>('/content', 'optional');
```

**Modes d'auth** :
- `true` (défaut) → Bearer requis, lève `AuthRequiredError` si absent
- `false` → requête publique, jamais de token
- `'optional'` → token injecté si disponible

**Gestion d'erreurs** :
```typescript
import { ApiError, AuthRequiredError, SessionExpiredError } from '@/core/errors';

try {
  await api.post('/endpoint', data);
} catch (err) {
  if (err instanceof SessionExpiredError) {
    // Déconnecter l'utilisateur
  }
  if (err instanceof ApiError) {
    console.error(err.code, err.message);
  }
}
```

---

## STORES ZUSTAND

### Auth store
```typescript
const { user, isAuthenticated, isReady } = useAuthStore();
const setAuth = useAuthStore(s => s.setAuth);
const logout = useAuthStore(s => s.logout);

// Après login réussi
await setAuth(user, accessToken, refreshToken);

// Déconnexion
await logout();
```

### Profile store
```typescript
const { activeProfile, setActiveProfile } = useProfileStore();
```

### Toast
```typescript
import { showToast } from '@/presentation/utils/toast';
showToast('Message', 'success');  // 'success' | 'error' | 'info'
```

---

## THÈME — SEULE SOURCE DE VÉRITÉ

```typescript
import { colors }     from '@/theme/colors';
import { spacing }    from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { shadows }    from '@/theme/shadows';
import { layout }     from '@/theme/layout';

// Ne JAMAIS coder des valeurs en dur — toujours utiliser le thème
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,  // pas '#00050d'
    padding: spacing[4],                 // pas 16
    ...shadows.md,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
  },
});
```

### Palette principale
```
background: #00050d       (fond quasi-noir)
surface: #0a1018          (cards, panels)
primary: #e6007e          (magenta — couleur principale)
secondary: #ffb300        (doré — accents premium)
orange: #ff7b00           (orange — actions)
foreground: #e8edf4       (texte principal)
muted: #8b9cb3            (texte secondaire)
success: #34d399 | error: #f87171 | warning: #fbbf24
```

---

## NAVIGATION (Expo Router)

```typescript
import { useRouter, useLocalSearchParams } from 'expo-router';

const router = useRouter();
router.push('/content/[id]');
router.replace('/(tabs)');
router.back();

// Paramètres de route
const { id } = useLocalSearchParams<{ id: string }>();
```

**Structure des routes** :
- `/(auth)` → écrans login/register/OTP (headerShown: false)
- `/(tabs)` → navigation principale avec tabBar
- `/(profiles)` → sélection profil (modal)
- `/content/[id]` → fiche contenu
- `/watch/[id]` → player (fullScreenModal, sans header)

---

## COMPOSANTS UI (src/components/ui/)

```typescript
// Bouton principal
<Button label="Regarder" onPress={...} variant="primary" loading={false} />

// Input stylisé
<Input placeholder="Email" value={...} onChangeText={...} keyboardType="email-address" />

// État vide
<EmptyState icon={Film} title="Aucun contenu" subtitle="Revenez plus tard" />

// Screen (wrapper avec SafeAreaView + StatusBar)
<Screen edges={['bottom']} style={{ flex: 1 }}>...</Screen>
```

---

## QUERY KEYS — RÈGLE D'OR

Toujours utiliser `QueryKeys` de `@/core/constants/query-keys` :
```typescript
// ✅ Correct
queryKey: QueryKeys.content.detail(id, profileId)
queryKey: QueryKeys.subscription.active()

// ❌ Interdit (chaînes magiques)
queryKey: ['content', id]
queryKey: ['subscription', 'me']
```

Invalider correctement :
```typescript
queryClient.invalidateQueries({ queryKey: QueryKeys.content.all() });
queryClient.invalidateQueries({ queryKey: QueryKeys.favorites.list(profileId) });
```

---

## VARIABLES D'ENVIRONNEMENT (.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_MINIO_URL=http://localhost:9000
EXPO_PUBLIC_MINIO_ASSETS_BUCKET=ivod-assets
```

---

## COMMANDES

```bash
# Démarrer Expo (simulateur ou device)
cd apps/mobile && npx expo start

# Simulateur iOS
npx expo run:ios

# Simulateur Android
npx expo run:android

# Build EAS
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Clear cache Expo
npx expo start --clear
```
