import { useEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { CatalogScreen } from "@/components/catalog/CatalogScreen";
import { useContentTypes } from "@/hooks/use-content-types";
import { CATALOG_SECTIONS } from "@/core/catalog/sections";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { BackButton } from "@/components/layout/BackButton";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "@/theme/colors";

export default function CatalogTypeScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const navigation = useNavigation();
  const { catalogSections, isLoading } = useContentTypes();

  const section =
    (type ? catalogSections[type] : undefined) ??
    (type ? CATALOG_SECTIONS[type] : undefined);

  useEffect(() => {
    if (section) navigation.setOptions({ title: section.title });
  }, [section, navigation]);

  if (isLoading && !section) {
    return (
      <PageCanvas>
        <BackButton />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} />
        </View>
      </PageCanvas>
    );
  }

  if (!section) {
    return (
      <PageCanvas>
        <BackButton />
        <View style={styles.centered}>
          <Text style={styles.err}>Catalogue introuvable</Text>
        </View>
      </PageCanvas>
    );
  }

  return <CatalogScreen section={section} />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 },
  err: { color: colors.muted },
});
