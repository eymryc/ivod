import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { contentsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { ContentRow } from "@/components/content/ContentRow";
import type { ContentItem } from "@/components/content/ContentCard";
import { colors } from "@/theme/colors";

interface Props {
  contentId: string;
  genreCode?: string;
  contentTypeCode?: string;
}

export function SimilarContentRow({ contentId, genreCode, contentTypeCode }: Props) {
  const { data } = useQuery({
    queryKey: QueryKeys.content.similar(contentId, genreCode, contentTypeCode),
    queryFn: () =>
      contentsApi.list({
        ...(genreCode ? { genre: genreCode } : {}),
        ...(contentTypeCode ? { contentType: contentTypeCode } : {}),
        limit: 12,
      }),
    enabled: !!contentTypeCode || !!genreCode,
  });

  const items = ((data as { items?: ContentItem[] })?.items ?? []).filter(
    (i) => i.id !== contentId,
  ) as ContentItem[];

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Similaires</Text>
      <ContentRow title="" items={items.slice(0, 10)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground, paddingHorizontal: 16, marginBottom: 4 },
});
