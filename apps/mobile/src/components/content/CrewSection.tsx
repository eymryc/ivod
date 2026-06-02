import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { peopleApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { colors } from "@/theme/colors";

interface Props {
  contentId: string;
}

export function CrewSection({ contentId }: Props) {
  const router = useRouter();
  const { data: cast = [] } = useQuery({
    queryKey: QueryKeys.people.cast(contentId),
    queryFn: () => peopleApi.getCast(contentId),
  });

  const list = cast as Array<{
    id: string;
    characterName?: string;
    person?: { id: string; fullName?: string; stageName?: string };
  }>;

  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Distribution</Text>
      {list.slice(0, 8).map((row) => (
        <TouchableOpacity
          key={row.id}
          style={styles.row}
          onPress={() => row.person?.id && router.push(`/person/${row.person.id}`)}
        >
          <Text style={styles.name}>
            {row.person?.stageName ?? row.person?.fullName ?? "—"}
          </Text>
          {row.characterName ? (
            <Text style={styles.role}>{row.characterName}</Text>
          ) : null}
        </TouchableOpacity>
      ))}
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
  name: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  role: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
