import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react-native";
import { peopleApi } from "@/infrastructure/api";
import { InnerPage } from "@/components/layout/InnerPage";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { MetaChip } from "@/components/layout/MetaChip";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: () => peopleApi.getOne(id!),
    enabled: !!id,
  });

  const p = person as Record<string, unknown> | undefined;
  const name = (p?.stageName as string) ?? (p?.fullName as string) ?? "Artiste";

  if (isLoading) {
    return (
      <InnerPage>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} />
        </View>
      </InnerPage>
    );
  }

  return (
    <InnerPage>
      <TabPageHeader showBack={false} title={name} subtitle="Fiche artiste" kicker="Casting" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <User color={colors.magenta} size={40} />
        </View>
        {p?.nationality ? (
          <MetaChip label={p.nationality as string} style={styles.chip} />
        ) : null}
        <PremiumPanel style={styles.bioPanel}>
          {p?.biography ? (
            <Text style={styles.bio}>{p.biography as string}</Text>
          ) : (
            <Text style={styles.empty}>Aucune biographie disponible.</Text>
          )}
        </PremiumPanel>
      </ScrollView>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 },
  heroIcon: {
    width: 88,
    height: 88,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  chip: { alignSelf: "flex-start", marginBottom: 20 },
  bioPanel: { marginTop: 8 },
  bio: { ...typography.body, lineHeight: 24, color: colors.muted },
  empty: { ...typography.bodyMuted },
});
