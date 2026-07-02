import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { awardsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { colors } from "@/theme/colors";

interface Props {
  contentId: string;
}

export function AwardsSection({ contentId }: Props) {
  const { data: awards = [] } = useQuery({
    queryKey: QueryKeys.awards.list(contentId),
    queryFn: () => awardsApi.listForContent(contentId),
  });

  const list = awards as Array<{
    award?: { name?: string; year?: number };
    won?: boolean;
    name?: string;
    year?: number;
    isWinner?: boolean;
  }>;

  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Récompenses</Text>
      {list.map((a, i) => {
        const name = a.award?.name ?? a.name;
        const year = a.award?.year ?? a.year;
        const won = a.won ?? a.isWinner;
        return (
          <View key={i} style={styles.row}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>
              {year ? `${year} · ` : ""}
              {won ? "Lauréat" : "Nomination"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  row: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { fontSize: 14, fontWeight: "600", color: colors.gold },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
