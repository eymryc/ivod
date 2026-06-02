import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import {
  contentsApi,
  searchApi,
  bannersApi,
  watchApi,
  favoritesApi,
  recommendationApi,
  homeApi,
} from "@/infrastructure/api";
import type { HomeSection } from "@/infrastructure/api";
import { ContentRow } from "@/components/content/ContentRow";
import { ContentRowSkeleton } from "@/components/content/ContentRowSkeleton";
import type { ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { AppHeader, HeaderIconButton } from "@/components/layout/AppHeader";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { HomeHero } from "@/components/home/HomeHero";
import { PremiumOfferCard } from "@/components/home/PremiumOfferCard";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import type { CatalogQuerySection } from "@/infrastructure/api";

// ── Helpers ──────────────────────────────────────────────────────────────

function mapItems(raw: unknown): ContentItem[] {
  const items = (raw as { items?: unknown[] })?.items ?? (Array.isArray(raw) ? raw : []);
  return items as ContentItem[];
}

type HistoryEntry = {
  id: string;
  contentId: string;
  episodeId?: string | null;
  percentage?: number;
  completed?: boolean;
  content?: { id?: string; title?: string; thumbnailUrl?: string | null; posterUrl?: string | null };
};

function dedupeResume(items: HistoryEntry[]): HistoryEntry[] {
  const seen = new Set<string>();
  return items.filter((h) => {
    if (!h.content || h.completed || (h.percentage ?? 0) >= 92) return false;
    if (seen.has(h.contentId)) return false;
    seen.add(h.contentId);
    return true;
  });
}

// ── Composant section catalogue dynamique ────────────────────────────────

function CatalogSectionRow({ section }: { section: CatalogQuerySection }) {
  const p = section.params;
  const { data, isLoading } = useQuery({
    queryKey: ["home-section", section.id],
    queryFn: () =>
      contentsApi.list({
        ...(p.contentType ? { contentType: p.contentType } : {}),
        ...(p.sort ? { sort: p.sort } : {}),
        limit: p.limit ?? 16,
      }),
    staleTime: 5 * 60_000,
  });
  const items = mapItems(data);
  if (isLoading && !items.length) return <ContentRowSkeleton title={section.title} />;
  if (!items.length) return null;
  return <ContentRow title={section.title} items={items} cardWidth={128} />;
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profile = useProfileStore((s) => s.getActiveProfile());
  const { data: sectionsData } = useQuery({
    queryKey: ['home-sections'],
    queryFn: () => homeApi.getSections(),
    staleTime: 60 * 60_000,
  });
  const sections: HomeSection[] = (sectionsData ?? []).filter(
    (s) => !s.requiresAuth || isAuth,
  );

  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: () => bannersApi.list("CI", "PREMIUM"),
  });

  const { data: trendingData } = useQuery({
    queryKey: ["home-section", "trending"],
    queryFn: () => searchApi.trending("24h"),
    staleTime: 5 * 60_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["watch-history", profile?.id],
    queryFn: () => watchApi.getHistory(profile?.id, 1, 20),
    enabled: isAuth,
    staleTime: 60_000,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["favorites-home", profile?.id],
    queryFn: () => favoritesApi.list(1, profile?.id),
    enabled: isAuth,
    staleTime: 2 * 60_000,
  });

  const { data: recoData } = useQuery({
    queryKey: ["recommendations-home", profile?.id],
    queryFn: () => recommendationApi.list(profile?.id, 16),
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  const trendingItems = mapItems(trendingData);
  const bannerList = Array.isArray(banners) ? banners : [];
  const banner = bannerList[0] ?? null;

  const heroId = (banner as { contentId?: string })?.contentId ?? trendingItems[0]?.id;
  const heroImage =
    (banner as { imageUrl?: string })?.imageUrl ??
    (banner as { imageObjectKey?: string })?.imageObjectKey ??
    trendingItems[0]?.posterUrl ??
    trendingItems[0]?.thumbnailUrl;
  const heroTitle = (banner as { title?: string })?.title ?? trendingItems[0]?.title;
  const heroSub = (trendingItems[0] as { description?: string })?.description;

  const resumeItems: ContentItem[] = dedupeResume(
    (historyData?.items ?? []) as HistoryEntry[]
  ).map((h) => ({
    id: h.contentId,
    title: h.content?.title ?? "Contenu",
    thumbnailUrl: h.content?.thumbnailUrl ?? null,
    posterUrl: h.content?.posterUrl ?? null,
    progress: h.percentage ?? null,
  }));

  const favoriteItems: ContentItem[] = ((favoritesData as { items?: unknown[] })?.items ?? [])
    .map((f) => (f as { content?: ContentItem })?.content)
    .filter((c): c is ContentItem => !!c);

  const recoItems: ContentItem[] = mapItems(recoData);

  function renderSection(section: HomeSection) {
    switch (section.type) {
      case "continue_watching":
        if (!resumeItems.length) return null;
        return <ContentRow key={section.id} title={section.title} items={resumeItems} cardWidth={128} />;

      case "my_list":
        if (!favoriteItems.length) return null;
        return <ContentRow key={section.id} title={section.title} items={favoriteItems} cardWidth={128} />;

      case "trending":
        if (!trendingItems.length) return null;
        return <ContentRow key={section.id} title={section.title} items={trendingItems} cardWidth={128} />;

      case "recommendations":
        if (!recoItems.length) return null;
        return <ContentRow key={section.id} title={section.title} items={recoItems} cardWidth={128} />;

      case "catalog_query":
        return <CatalogSectionRow key={section.id} section={section as CatalogQuerySection} />;

      default:
        return null;
    }
  }

  return (
    <PageCanvas minimal>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        <View style={styles.headerOverlay}>
          <AppHeader
            logoSize="md"
            overlay
            subtitle={profile ? `Profil · ${profile.name}` : undefined}
            right={
              isAuth ? (
                <HeaderIconButton onPress={() => router.push("/notifications")}>
                  <Bell color={colors.foreground} size={22} />
                </HeaderIconButton>
              ) : null
            }
          />
        </View>

        <HomeHero
          imageUri={typeof heroImage === "string" ? heroImage : undefined}
          title={heroTitle ?? undefined}
          subtitle={typeof heroSub === "string" ? heroSub : undefined}
          onPress={() => (heroId ? router.push(`/content/${heroId}`) : router.push("/browse"))}
          edgeToEdge
        />

        <HorizontalPillBar style={styles.pills}>
          <FilterPill label="Explorer" onPress={() => router.push("/browse")} />
          <FilterPill label="Films" onPress={() => router.push("/catalog/FILM" as never)} />
          <FilterPill label="Séries" onPress={() => router.push("/catalog/SERIE" as never)} />
          {isAuth && (
            <FilterPill label="Pour vous" onPress={() => router.push("/recommendations")} />
          )}
        </HorizontalPillBar>

        <View style={styles.rails}>
          {sections.map(renderSection)}
        </View>

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
  pills: { marginTop: 4, marginBottom: 8 },
  rails: { marginTop: 4 },
});
