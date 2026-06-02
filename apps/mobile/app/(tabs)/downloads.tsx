import { useMemo } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Download, Trash2 } from "lucide-react-native";
import { downloadsApi } from "@/infrastructure/api";
import {
  getOfflineItems,
  removeOfflineItem,
  offlineBadgeLabel,
  type OfflineItem,
} from "@/infrastructure/services/offline-storage";
import { useAuthStore } from "@/store/auth.store";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { MediaListRow } from "@/components/layout/MediaListRow";
import { layout } from "@/theme/layout";
import { colors } from "@/theme/colors";

type DownloadRow = {
  id: string;
  contentId: string;
  quality?: string;
  expiresAt?: string;
  content?: { title?: string; thumbnailUrl?: string };
  offline?: OfflineItem;
};

export default function DownloadsScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery({
    queryKey: ["downloads"],
    queryFn: () => downloadsApi.list(),
    enabled: isAuth,
  });

  const { data: offlineItems = [] } = useQuery({
    queryKey: ["offline-local"],
    queryFn: () => getOfflineItems(),
    enabled: isAuth,
  });

  const rows: DownloadRow[] = useMemo(() => {
    const offlineByContent = new Map(offlineItems.map((o) => [o.contentId, o]));
    return (downloads as DownloadRow[]).map((d) => ({
      ...d,
      offline: offlineByContent.get(d.contentId),
    }));
  }, [downloads, offlineItems]);

  const { mutate: remove } = useMutation({
    mutationFn: async (row: DownloadRow) => {
      await downloadsApi.remove(row.id);
      if (row.offline) await removeOfflineItem(row.offline.downloadId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["downloads"] });
      qc.invalidateQueries({ queryKey: ["offline-local"] });
    },
  });

  if (!isAuth) {
    return (
      <PageCanvas>
        <TabPageHeader title="Téléchargements" subtitle="Regardez hors ligne." kicker="Offline" />
        <EmptyState
          icon={Download}
          title="Connectez-vous"
          description="Téléchargez vos contenus pour les regarder sans réseau."
          actionLabel="Se connecter"
          onAction={() => router.push("/(auth)/login")}
        />
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <View style={styles.root}>
        <TabPageHeader
          title="Téléchargements"
          subtitle="Fichiers disponibles hors connexion."
          kicker="Offline"
        />
        {!isLoading && rows.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Aucun téléchargement"
            description="Téléchargez depuis la fiche d'un film ou d'une série."
            actionLabel="Catalogue"
            onAction={() => router.push("/(tabs)/search")}
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item: d }) => {
              const thumb = d.offline?.posterLocalUri ?? d.content?.thumbnailUrl;
              const badge = d.offline ? offlineBadgeLabel(d.offline) : null;
              const meta = [
                d.quality,
                badge,
                d.expiresAt ? `Expire ${new Date(d.expiresAt).toLocaleDateString("fr-FR")}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <MediaListRow
                  title={d.offline?.title ?? d.content?.title ?? "Contenu"}
                  meta={meta || undefined}
                  imageUri={thumb}
                  onPress={() => router.push(`/watch/${d.contentId}`)}
                  right={
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Supprimer", "Retirer ce téléchargement ?", [
                          { text: "Annuler", style: "cancel" },
                          { text: "Supprimer", style: "destructive", onPress: () => remove(d) },
                        ])
                      }
                      style={styles.del}
                    >
                      <Trash2 color={colors.error} size={20} />
                    </TouchableOpacity>
                  }
                />
              );
            }}
          />
        )}
      </View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: layout.pagePaddingX, paddingBottom: layout.tabBarOffset },
  del: { padding: 14 },
});
