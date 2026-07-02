import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { User, Film } from "lucide-react-native";
import { peopleApi } from "@/infrastructure/api";
import { InnerPage } from "@/components/layout/InnerPage";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { MetaChip } from "@/components/layout/MetaChip";
import { AccentLine } from "@/components/layout/AccentLine";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { mediaUrl } from "@/presentation/utils/media-url";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

type PersonRecord = {
  fullName?: string;
  stageName?: string;
  nationality?: string;
  biography?: string;
  avatarObjectKey?: string;
  castAppearances?: Array<{ content?: ContentItem }>;
  crewAppearances?: Array<{ content?: ContentItem }>;
  cast?: Array<{ content?: ContentItem }>;
  crew?: Array<{ content?: ContentItem }>;
};

function collectFilmography(person: PersonRecord): ContentItem[] {
  const cast = person.castAppearances ?? person.cast ?? [];
  const crew = person.crewAppearances ?? person.crew ?? [];
  const map = new Map<string, ContentItem>();
  [...cast, ...crew].forEach((entry) => {
    const content = entry.content;
    if (content?.id && !map.has(content.id)) map.set(content.id, content);
  });
  return Array.from(map.values());
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: person, isLoading, error } = useQuery({
    queryKey: ["person", id],
    queryFn: () => peopleApi.getOne(id!) as Promise<PersonRecord>,
    enabled: !!id,
    staleTime: 30 * 60_000,
  });

  if (isLoading) {
    return (
      <InnerPage>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} />
        </View>
      </InnerPage>
    );
  }

  if (error || !person) {
    return (
      <InnerPage>
        <TabPageHeader showBack title="Artiste" subtitle="Fiche introuvable" kicker="Casting" />
        <View style={styles.centered}>
          <Text style={styles.empty}>Personne introuvable.</Text>
        </View>
      </InnerPage>
    );
  }

  const name = person.stageName ?? person.fullName ?? "Artiste";
  const photoUrl = mediaUrl(person.avatarObjectKey);
  const contents = collectFilmography(person);

  return (
    <InnerPage>
      <TabPageHeader showBack={false} title={name} subtitle="Fiche artiste" kicker="Casting" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.heroIcon}>
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.heroMeta}>
            {person.stageName && person.fullName && person.stageName !== person.fullName ? (
              <Text style={styles.alias}>Alias : {person.fullName}</Text>
            ) : null}
            {person.nationality ? <MetaChip label={person.nationality} style={styles.chip} /> : null}
          </View>
        </View>

        <PremiumPanel style={styles.bioPanel}>
          {person.biography ? (
            <Text style={styles.bio}>{person.biography}</Text>
          ) : (
            <Text style={styles.empty}>Aucune biographie disponible.</Text>
          )}
        </PremiumPanel>

        {contents.length > 0 ? (
          <View style={styles.filmography}>
            <View style={styles.sectionHead}>
              <Film color={colors.magenta} size={18} />
              <Text style={styles.sectionTitle}>Filmographie</Text>
            </View>
            <AccentLine width={48} style={{ marginBottom: 16 }} />
            <View style={styles.grid}>
              {contents.map((item) => (
                <ContentGridCell key={item.id}>
                  <ContentCard item={item} width={layout.gridCardWidth} />
                </ContentGridCell>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noCredits}>
            <User color={colors.muted} size={28} />
            <Text style={styles.empty}>Aucun titre associé pour le moment.</Text>
          </View>
        )}
      </ScrollView>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 },
  heroRow: { flexDirection: "row", gap: 16, marginBottom: 20, alignItems: "flex-start" },
  avatar: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: colors.surface,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 36, fontWeight: "700", color: "rgba(255,255,255,0.35)" },
  heroMeta: { flex: 1, gap: 8, paddingTop: 4 },
  alias: { ...typography.bodyMuted, fontSize: 13 },
  chip: { alignSelf: "flex-start" },
  bioPanel: { marginBottom: 24 },
  bio: { ...typography.body, lineHeight: 24, color: colors.muted },
  empty: { ...typography.bodyMuted },
  filmography: { marginTop: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { ...typography.h3 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  noCredits: { alignItems: "center", gap: 12, paddingVertical: 32 },
});
