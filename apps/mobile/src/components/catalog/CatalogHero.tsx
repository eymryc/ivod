import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play } from "lucide-react-native";
import type { CatalogSectionConfig } from "@/core/catalog/sections";
import type { ContentItem } from "@/components/content/ContentCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

const SW = Dimensions.get("window").width;

interface Props {
  section: CatalogSectionConfig;
  total?: number;
  featured?: ContentItem | null;
}

export function CatalogHero({ section, total, featured }: Props) {
  const router = useRouter();
  const backdrop = featured?.posterUrl ?? featured?.thumbnailUrl;

  return (
    <View style={styles.wrap}>
      <View style={styles.backdrop}>
        {backdrop ? (
          <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.backdropPh} />
        )}
        <LinearGradient
          colors={["rgba(3,5,8,0.35)", "rgba(0,5,13,0.92)", colors.background]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["transparent", "rgba(230,0,126,0.18)", "transparent"]}
          start={{ x: 0.7, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
        />
      </View>

      <View style={styles.content}>
        <PageHeader
          kicker={section.kicker}
          title={section.title}
          subtitle={
            total != null
              ? `${total} titre${total > 1 ? "s" : ""}${section.description ? ` · ${section.description}` : ""}`
              : section.description
          }
          accentWidth={56}
        />

        {featured ? (
          <TouchableOpacity
            style={styles.featured}
            activeOpacity={0.9}
            onPress={() => router.push(`/content/${featured.id}`)}
          >
            <View style={styles.featuredPoster}>
              {backdrop ? (
                <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : null}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.85)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.play}>
                <Play color="#fff" size={22} fill="#fff" />
              </View>
            </View>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredKicker}>À la une</Text>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {featured.title}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  backdrop: { height: SW * 0.52, overflow: "hidden" },
  backdropPh: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
  },
  content: { marginTop: -SW * 0.28 },
  featured: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  featuredPoster: { height: 160, justifyContent: "flex-end" },
  play: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 44,
    height: 44,
    backgroundColor: "rgba(230,0,126,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredMeta: { padding: 14, gap: 4 },
  featuredKicker: {
    ...typography.kicker,
    color: colors.gold,
    fontSize: 10,
  },
  featuredTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
});
