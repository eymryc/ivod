import { FlatList, View, StyleSheet, Alert, TouchableOpacity, Text } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { History } from "lucide-react-native";
import { watchApi } from "@/infrastructure/api";
import { useProfileStore } from "@/store/profile.store";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { MediaListRow } from "@/components/layout/MediaListRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/theme/colors";

export default function HistoryScreen() {
  const router = useRouter();
  const profileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["history", profileId],
    queryFn: () => watchApi.history(profileId ?? undefined),
  });

  const clear = useMutation({
    mutationFn: () => watchApi.clearHistory(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      Alert.alert("Historique", "Historique effacé.");
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  const items = (data as { items?: unknown[] })?.items ?? [];

  return (
    <SettingsPage title="Historique" description="Vos derniers visionnages." icon={History}>
      {items.length > 0 ? (
        <TouchableOpacity
          style={styles.clearWrap}
          onPress={() =>
            Alert.alert("Effacer l'historique", "Cette action est irréversible.", [
              { text: "Annuler", style: "cancel" },
              { text: "Effacer", style: "destructive", onPress: () => clear.mutate() },
            ])
          }
        >
          <Text style={styles.clearText}>Tout effacer</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(i: unknown) => (i as { id: string }).id}
        scrollEnabled={false}
        ListEmptyComponent={
          <EmptyState icon={History} title="Aucun historique" description="Commencez à regarder du contenu." />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }: { item: unknown }) => {
          const h = item as {
            contentId: string;
            content?: { title?: string; thumbnailUrl?: string };
            watchedSeconds?: number;
          };
          return (
            <MediaListRow
              title={h.content?.title ?? "Contenu"}
              meta={h.watchedSeconds ? `${Math.floor(h.watchedSeconds / 60)} min` : undefined}
              imageUri={h.content?.thumbnailUrl}
              onPress={() => router.push(`/content/${h.contentId}`)}
            />
          );
        }}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  clearWrap: { alignSelf: "flex-end", marginBottom: 12 },
  clearText: { fontSize: 13, fontWeight: "600", color: colors.error },
});
