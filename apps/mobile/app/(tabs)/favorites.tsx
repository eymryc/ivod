import { View, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react-native";
import { useRouter } from "expo-router";
import { favoritesApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

export default function FavoritesScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);

  const { data, isLoading } = useQuery({
    queryKey: ["favorites", profileId],
    queryFn: () => favoritesApi.list(1, profileId ?? undefined),
    enabled: isAuth,
  });

  if (!isAuth) {
    return (
      <PageCanvas>
        <TabPageHeader title="Mes favoris" subtitle="Enregistrez vos contenus préférés." kicker="Bibliothèque" />
        <EmptyState
          icon={Heart}
          title="Connectez-vous"
          description="Vos favoris sont liés à votre profil iVOD."
          actionLabel="Se connecter"
          onAction={() => router.push("/(auth)/login")}
        />
      </PageCanvas>
    );
  }

  const items = ((data as { items?: { content?: ContentItem; contentId?: string; id: string }[] })?.items ?? [])
    .map((f) => (f.content ? { ...f.content, id: f.content.id ?? f.contentId! } : null))
    .filter(Boolean) as ContentItem[];

  return (
    <PageCanvas>
      <View style={styles.root}>
        <TabPageHeader
          title="Mes favoris"
          subtitle="Vos contenus enregistrés par profil."
          kicker="Bibliothèque"
        />
        {isLoading ? (
          <ActivityIndicator color={colors.magenta} style={styles.loader} />
        ) : !items.length ? (
          <EmptyState
            icon={Heart}
            title="Aucun favori"
            description="Ajoutez des films et séries depuis leur fiche."
            actionLabel="Explorer"
            onAction={() => router.push("/(tabs)/search")}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ContentGridCell>
                <ContentCard item={item} width={layout.gridCardWidth} />
              </ContentGridCell>
            )}
          />
        )}
      </View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { marginTop: 48 },
  grid: { paddingHorizontal: layout.pagePaddingX, paddingBottom: layout.tabBarOffset },
  row: { gap: layout.gridGap, marginBottom: layout.gridGap, justifyContent: "space-between" },
});
