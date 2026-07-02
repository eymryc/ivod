import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react-native";
import { recommendationsApi, contentsApi, catalogApi } from "@/infrastructure/api";
import { railToListParams } from "@/core/catalog/rail-query";
import { useProfileStore } from "@/store/profile.store";
import { useAuthStore } from "@/store/auth.store";
import { ContentRow } from "@/components/content/ContentRow";
import type { ContentItem } from "@/components/content/ContentCard";
import { useRouter } from "expo-router";
import { InnerPage } from "@/components/layout/InnerPage";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

export default function RecommendationsScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();

  const refresh = useMutation({
    mutationFn: () => recommendationsApi.generate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations"] }),
  });

  const { data: reco, isLoading } = useQuery({
    queryKey: ["recommendations", profileId],
    queryFn: () => recommendationsApi.list(profileId ?? undefined),
    enabled: isAuth,
  });

  const { data: homeRails } = useQuery({
    queryKey: ["catalog-rails", "home"],
    queryFn: () => catalogApi.getRails("home"),
    staleTime: 60 * 60_000,
  });

  const trendingRail = (homeRails ?? []).find((r) => r.id === "trending");

  const { data: trending } = useQuery({
    queryKey: ["reco-trending", trendingRail?.query],
    queryFn: () => contentsApi.list(railToListParams(trendingRail?.query)),
    enabled: !!trendingRail,
    staleTime: 3 * 60_000,
  });

  const recoList = (
    (reco as { items?: ContentItem[] })?.items ?? (Array.isArray(reco) ? reco : [])
  ) as ContentItem[];
  const trendingList = ((trending as { items?: ContentItem[] })?.items ?? []) as ContentItem[];

  if (!isAuth) {
    return (
      <InnerPage>
        <TabPageHeader
          showBack={false}
          title="Pour vous"
          subtitle="Connectez-vous pour des recommandations personnalisées."
          kicker="Personnalisé"
        />
        <View style={styles.guest}>
          <Button title="Se connecter" onPress={() => router.push("/(auth)/login")} />
        </View>
      </InnerPage>
    );
  }

  return (
    <InnerPage>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <TabPageHeader
              showBack={false}
              title="Pour vous"
              subtitle="Basé sur vos habitudes de visionnage."
              kicker="Personnalisé"
            />
          </View>
          <TouchableOpacity style={styles.refresh} onPress={() => refresh.mutate()}>
            <RefreshCw color={colors.muted} size={20} />
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.magenta} style={{ marginVertical: 24 }} />
        ) : recoList.length > 0 ? (
          <ContentRow title="Recommandés" items={recoList} />
        ) : null}
        <ContentRow
          title={trendingRail?.title ?? "Tendances"}
          items={trendingList}
        />
        <View style={{ height: 32 }} />
      </ScrollView>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "flex-start", paddingRight: layout.pagePaddingX },
  refresh: {
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,5,13,0.5)",
  },
  guest: { padding: layout.pagePaddingX },
});
