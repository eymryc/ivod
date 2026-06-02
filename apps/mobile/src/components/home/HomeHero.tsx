import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Sparkles } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const SW = Dimensions.get("window").width;
const HERO_H = Math.min(Dimensions.get("window").height * 0.52, 380);

interface HomeHeroProps {
  imageUri?: string;
  title?: string;
  subtitle?: string;
  onPress: () => void;
  /** Pleine largeur (sans marge latérale) */
  edgeToEdge?: boolean;
}

/** Hero cinéma — toujours visible avec repli éditorial si pas de contenu API */
export function HomeHero({
  imageUri,
  title,
  subtitle,
  onPress,
  edgeToEdge = true,
}: HomeHeroProps) {
  const displayTitle = title?.trim() || "Cinéma africain & diaspora";
  const displaySub =
    subtitle?.trim() ||
    "Films & séries — découvrez la sélection iVOD.";

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.wrap, edgeToEdge && styles.wrapEdge]}
    >
      <View style={styles.media}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#1a0a2e", "#0d1528", "#000508"]}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <LinearGradient
          colors={["rgba(0,5,13,0.05)", "rgba(0,5,13,0.5)", "rgba(0,5,13,0.98)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["transparent", "rgba(123,0,153,0.35)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.55 }]}
        />
        {!imageUri ? (
          <View style={styles.fallbackIcon}>
            <Sparkles color={colors.magenta} size={32} />
          </View>
        ) : null}
      </View>

      <View style={[styles.copy, edgeToEdge && styles.copyEdge]}>
        <GradientText style={styles.editorial}>À la une</GradientText>
        <AccentLine width={48} style={{ marginVertical: 8 }} />
        <Text style={styles.title} numberOfLines={2}>
          {displayTitle}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {displaySub}
        </Text>
        <View style={styles.ctaRow}>
          <LinearGradient
            colors={[...gradients.primaryBtn]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.playBtn}
          >
            <Play color="#fff" size={20} fill="#fff" />
            <Text style={styles.playLabel}>Découvrir</Text>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: layout.pagePaddingX,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  wrapEdge: {
    marginHorizontal: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginBottom: 16,
  },
  media: {
    height: HERO_H,
    width: "100%",
  },
  fallbackIcon: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    opacity: 0.5,
  },
  copy: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    marginTop: -88,
  },
  copyEdge: {
    paddingHorizontal: layout.pagePaddingX + 2,
  },
  editorial: { fontSize: 10, letterSpacing: 3.2 },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: Math.min(30, SW * 0.075),
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 34,
  },
  subtitle: {
    ...typography.bodyMuted,
    marginTop: 8,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  ctaRow: { marginTop: 16 },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  playLabel: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
