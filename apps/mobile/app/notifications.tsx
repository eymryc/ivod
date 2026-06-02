import { View, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { notificationsApi } from "@/infrastructure/api";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { BackButton } from "@/components/layout/BackButton";
import { ListCard } from "@/components/layout/ListCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = Array.isArray(data) ? data : [];

  return (
    <PageCanvas>
      <BackButton />
      <TabPageHeader
        showBack={false}
        title="Notifications"
        subtitle="Alertes et actualités de votre compte."
        kicker="Compte"
      />
      {items.length > 0 ? (
        <TouchableOpacity style={styles.markAll} onPress={() => markAll.mutate()}>
          <Text style={styles.markAllText}>Tout marquer lu</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(n: unknown) => (n as { id: string }).id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour." />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }: { item: unknown }) => {
          const n = item as {
            id: string;
            title?: string;
            body?: string;
            read?: boolean;
            createdAt?: string;
          };
          return (
            <ListCard
              title={n.title ?? "Notification"}
              body={n.body}
              unread={!n.read}
              meta={
                n.createdAt ? new Date(n.createdAt).toLocaleString("fr-FR") : undefined
              }
            />
          );
        }}
      />
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  markAll: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 8, alignItems: "flex-end" },
  markAllText: { color: colors.magenta, fontWeight: "600", fontSize: 13 },
  list: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 32, gap: 8 },
});
