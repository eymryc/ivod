import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react-native";
import { followsApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { InnerPage } from "@/components/layout/InnerPage";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/presentation/utils/toast";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function FollowingScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["follows"],
    queryFn: () => followsApi.list(),
    enabled: isAuth,
  });

  const unfollow = useMutation({
    mutationFn: (id: string) => followsApi.unfollow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follows"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = creators as Array<{
    id: string;
    stageName?: string;
    avatarUrl?: string;
  }>;

  if (!isAuth) {
    return (
      <InnerPage>
        <TabPageHeader showBack={false} title="Créateurs suivis" kicker="Social" />
        <View style={styles.guest}>
          <Button title="Se connecter" onPress={() => router.push("/(auth)/login")} />
        </View>
      </InnerPage>
    );
  }

  return (
    <InnerPage>
      <TabPageHeader
        showBack={false}
        title={`Créateurs suivis (${list.length})`}
        subtitle="Retrouvez leurs dernières sorties sur iVOD."
        kicker="Abonnements"
      />
      {isLoading ? (
        <ActivityIndicator color={colors.magenta} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon={Users} title="Aucun abonnement" description="Suivez des créateurs depuis leur fiche." />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity style={styles.left} onPress={() => router.push(`/creator/${item.id}`)}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPh]} />
                )}
                <Text style={typography.h3}>{item.stageName ?? "Créateur"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => unfollow.mutate(item.id)}>
                <Text style={styles.unfollow}>Ne plus suivre</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 32 },
  guest: { padding: layout.pagePaddingX },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.7)",
    padding: 12,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44 },
  avatarPh: { backgroundColor: colors.card },
  unfollow: { color: colors.error, fontSize: 12, fontWeight: "600" },
});
