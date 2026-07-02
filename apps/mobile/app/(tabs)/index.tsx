import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { bannersApi, subscriptionApi, watchApi } from "@/infrastructure/api";
import { CatalogRails } from "@/components/catalog/CatalogRails";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { HomeTopBar, HomeTopIconButton } from "@/components/home/HomeTopBar";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { PremiumPillDock } from "@/components/layout/PremiumPillDock";
import { CatalogContentArea } from "@/components/layout/CatalogContentArea";
import { HomeHero } from "@/components/home/HomeHero";
import { ResumePromptBanner } from "@/components/home/ResumePromptBanner";
import type { WatchHistoryEntry } from "@/core/entities";
import { canResumeSession } from "@/core/entities";
import { PremiumOfferCard } from "@/components/home/PremiumOfferCard";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { useContentTypes } from "@/hooks/use-content-types";
import { QueryKeys } from "@/core/constants/query-keys";
import { useScreenFocusRefetch } from "@/presentation/hooks/use-screen-focus-refetch";
import { getDefaultCountryCode } from "@/core/config/region";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [refreshing, setRefreshing] = useState(false);
  const profileId = useProfileStore((s) => s.activeProfileId);

  useScreenFocusRefetch([
    ['catalog-rails', 'home'],
    ['watch-history-rails', profileId, 'home'],
    ['favorites-rails', 'home', profileId],
    ['recommendations-rails', 'home'],
    QueryKeys.favorites.list(profileId),
    ['subscription-me'],
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['catalog-rails'] }),
      qc.invalidateQueries({ queryKey: ['catalog-rail-mobile'] }),
      qc.invalidateQueries({ queryKey: ['watch-history-rails'] }),
      qc.invalidateQueries({ queryKey: ['favorites-rails'] }),
      qc.invalidateQueries({ queryKey: ['recommendations-rails'] }),
      qc.invalidateQueries({ queryKey: ['banners'] }),
      qc.invalidateQueries({ queryKey: ['subscription-me'] }),
    ]);
    setRefreshing(false);
  }, [qc]);
  const user = useAuthStore((s) => s.user);
  const activeProfile = useProfileStore((s) => s.getActiveProfile());
  const { catalogNavLinks } = useContentTypes();

  const heroDisplayName =
    activeProfile?.name?.trim() ||
    user?.firstName?.trim() ||
    (user as { name?: string } | null)?.name?.trim() ||
    null;

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: () => subscriptionApi.getActive(),
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  const planCode =
    currentSub?.planDetails?.code ??
    currentSub?.plan ??
    currentSub?.planCode ??
    "FREE";

  const countryCode = getDefaultCountryCode();

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: QueryKeys.banners.list(countryCode, planCode),
    queryFn: () => bannersApi.list(countryCode, planCode),
    staleTime: 5 * 60_000,
  });

  const bannerList = Array.isArray(banners) ? banners : [];

  const { data: historyData } = useQuery({
    queryKey: ["watch-history-home", activeProfile?.id],
    queryFn: () => watchApi.getHistory(activeProfile?.id, 1, 50),
    enabled: isAuth,
    staleTime: 60_000,
  });

  const historyItems = ((historyData as { items?: WatchHistoryEntry[] })?.items ??
    []) as WatchHistoryEntry[];

  const historyMap = historyItems.reduce<Record<string, number>>((acc, h) => {
    const cid = h.contentId ?? (h as { content?: { id?: string } }).content?.id;
    if (cid) acc[cid] = h.percentage ?? 0;
    return acc;
  }, {});

  const latestResume =
    historyItems.find((h) => canResumeSession(h) && (h as { content?: { title?: string } }).content) ??
    null;

  return (
    <PageCanvas minimal>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.magenta}
            colors={[colors.magenta]}
          />
        }
      >
        <View style={styles.headerOverlay} pointerEvents="box-none">
          <HomeTopBar
            right={
              isAuth ? (
                <HomeTopIconButton onPress={() => router.push("/notifications")}>
                  <Bell color={colors.foreground} size={22} />
                </HomeTopIconButton>
              ) : null
            }
          />
        </View>

        <View style={styles.heroBlock}>
          <HomeHero
            banners={bannerList}
            isLoading={bannersLoading}
            isAuthenticated={isAuth}
            displayName={heroDisplayName}
            planCode={planCode}
          />

          <PremiumPillDock variant="bare" style={styles.heroPills}>
            <HorizontalPillBar edgeToEdge style={styles.pillsBar}>
              <FilterPill label="Explorer" onPress={() => router.push("/browse")} />
              {catalogNavLinks.map((link) => (
                <FilterPill
                  key={link.href}
                  label={link.label}
                  onPress={() => router.push(link.href as never)}
                />
              ))}
              {isAuth ? (
                <FilterPill label="Pour vous" onPress={() => router.push("/recommendations")} />
              ) : null}
            </HorizontalPillBar>
          </PremiumPillDock>
        </View>

        <CatalogContentArea>
          {isAuth && latestResume ? <ResumePromptBanner item={latestResume} /> : null}
          <CatalogRails surface="home" historyMap={historyMap} />
        </CatalogContentArea>

        {!isAuth && <PremiumOfferCard onPress={() => router.push("/pricing")} />}

        <View style={{ height: layout.tabBarOffset + 16 }} />
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroBlock: {
    position: "relative",
  },
  heroPills: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
  },
  pillsBar: {
    marginBottom: 0,
    maxHeight: 44,
  },
});
