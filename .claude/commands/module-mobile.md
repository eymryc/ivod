# Ajouter une feature au Mobile iVOD (Clean Architecture)

Argument attendu : nom de la feature en camelCase (ex: "playlists", "liveChat")

## Principe
La mobile suit une Clean Architecture stricte : `core` → `infrastructure` → `presentation` → composants → écrans.
Chaque couche a des règles d'import (voir CLAUDE.md mobile).

## Étapes

### 1. Entité (domaine)
```typescript
// apps/mobile/src/core/entities/ma-feature.entity.ts
/**
 * Entités du domaine <MaFeature>.
 * Ces types sont framework-agnostics et ne dépendent d'aucune bibliothèque externe.
 */
export interface MaFeature {
  id: string;
  nom: string;
  createdAt?: string;
}

export interface MaFeatureList {
  items: MaFeature[];
  total: number;
}
```

Exporter depuis `core/entities/index.ts` :
```typescript
export type { MaFeature, MaFeatureList } from './ma-feature.entity';
```

### 2. Query Keys
```typescript
// apps/mobile/src/core/constants/query-keys.ts — ajouter dans l'objet QueryKeys :
maFeature: {
  all:    ()         => ['ma-feature']          as const,
  list:   (params?)  => ['ma-feature', 'list', params] as const,
  detail: (id: string) => ['ma-feature', id]  as const,
},
```

### 3. Module API infrastructure
```typescript
// apps/mobile/src/infrastructure/api/modules/ma-feature.api.ts
/**
 * Adaptateur API pour le domaine MaFeature.
 * Encapsule tous les appels réseau liés à ce domaine.
 */
import { api } from '../client';
import type { MaFeature, MaFeatureList } from '@/core/entities/ma-feature.entity';

export const maFeatureApi = {
  /** Récupère la liste paginée. */
  list: (page = 1) =>
    api.get<MaFeatureList>(`/ma-feature?page=${page}`),

  /** Récupère le détail d'un item. */
  getById: (id: string) =>
    api.get<MaFeature>(`/ma-feature/${id}`),

  /** Crée un nouvel item (authentifié). */
  create: (data: Pick<MaFeature, 'nom'>) =>
    api.post<MaFeature>('/ma-feature', data),

  /** Supprime un item. */
  delete: (id: string) =>
    api.delete<{ message: string }>(`/ma-feature/${id}`),
};
```

Exporter depuis `infrastructure/api/index.ts` :
```typescript
export { maFeatureApi } from './modules/ma-feature.api';
```

### 4. Hooks de présentation
```typescript
// apps/mobile/src/presentation/hooks/use-ma-feature.ts
/**
 * Hooks React Query pour le domaine MaFeature.
 * Isole la logique de cache et mutation des composants.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/core/constants/query-keys';
import { maFeatureApi } from '@/infrastructure/api/modules/ma-feature.api';
import { showToast } from '@/presentation/utils/toast';

/** Charge la liste (paginée, stale 60s). */
export function useMaFeatureList(page = 1) {
  return useQuery({
    queryKey: QueryKeys.maFeature.list({ page }),
    queryFn: () => maFeatureApi.list(page),
    staleTime: 60_000,
  });
}

/** Charge le détail d'un item. */
export function useMaFeatureDetail(id: string) {
  return useQuery({
    queryKey: QueryKeys.maFeature.detail(id),
    queryFn: () => maFeatureApi.getById(id),
    enabled: !!id,
  });
}

/** Mutation de création avec invalidation automatique. */
export function useCreateMaFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: maFeatureApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.maFeature.all() });
      showToast('Créé avec succès', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
```

Exporter depuis `presentation/hooks/index.ts` :
```typescript
export { useMaFeatureList, useMaFeatureDetail, useCreateMaFeature } from './use-ma-feature';
```

### 5. Composants (si nécessaire)
```typescript
// apps/mobile/src/components/ma-feature/MaFeatureCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { MaFeature } from '@/core/entities/ma-feature.entity';

interface Props {
  item: MaFeature;
  onPress?: () => void;
}

/** Carte affichant un item MaFeature dans une liste. */
export function MaFeatureCard({ item, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{item.nom}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    padding: spacing[4],
    borderRadius: 8,
    marginBottom: spacing[2],
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
  },
});
```

### 6. Écran Expo Router
```typescript
// apps/mobile/app/ma-feature/index.tsx  (ou app/(tabs)/ma-feature.tsx)
import { FlatList } from 'react-native';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaFeatureCard } from '@/components/ma-feature/MaFeatureCard';
import { useMaFeatureList } from '@/presentation/hooks';

export default function MaFeatureScreen() {
  const { data, isLoading } = useMaFeatureList();
  const items = data?.items ?? [];

  return (
    <PageCanvas>
      <PageHeader title="MaFeature" />
      {items.length === 0 && !isLoading ? (
        <EmptyState title="Aucun élément" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MaFeatureCard item={item} />}
        />
      )}
    </PageCanvas>
  );
}
```

Si route dynamique `app/ma-feature/[id].tsx` :
```typescript
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

### 7. Naviguer vers la feature
Ajouter dans `_layout.tsx` si nécessaire :
```typescript
<Stack.Screen name="ma-feature/[id]" options={{ headerShown: false }} />
```

Naviguer depuis un composant :
```typescript
import { useRouter } from 'expo-router';
const router = useRouter();
router.push(`/ma-feature/${item.id}`);
```
