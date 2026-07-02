import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Trash2, Clock } from "lucide-react-native";
import {
  qualityShortLabel,
  formatExpiryChip,
} from "@/core/downloads/download-display";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { shadows } from "@/theme/shadows";

type Props = {
  title: string;
  thumb?: string | null;
  quality?: string;
  expiresAt?: string;
  onPress: () => void;
  onRemove: () => void;
};

/** Carte film — vignette 16:9 cinéma (Netflix / Prime). */
export function DownloadItemCard({
  title,
  thumb,
  quality,
  expiresAt,
  onPress,
  onRemove,
}: Props) {
  const expiry = formatExpiryChip(expiresAt);
  const qLabel = qualityShortLabel(quality);

  const confirmRemove = () => {
    Alert.alert("Supprimer", "Retirer ce téléchargement de l'appareil ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onRemove },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.card, shadows.card]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.media}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,5,13,0.35)", "rgba(0,5,13,0.92)"]}
          locations={[0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        {qLabel ? (
          <View style={styles.quality}>
            <Text style={styles.qualityText}>{qLabel}</Text>
          </View>
        ) : null}

        <View style={styles.playFab}>
          <Play color="#fff" size={22} fill="#fff" style={{ marginLeft: 2 }} />
        </View>

        <TouchableOpacity
          style={styles.del}
          onPress={confirmRemove}
          hitSlop={12}
        >
          <Trash2 color="rgba(255,255,255,0.65)" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {expiry ? (
          <View style={styles.expiryRow}>
            <Clock
              size={11}
              color={expiry.urgent ? colors.gold : colors.mutedDim}
            />
            <Text
              style={[
                styles.expiry,
                expiry.urgent && styles.expiryUrgent,
                expiry.expired && styles.expiryExpired,
              ]}
            >
              {expiry.label}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const CARD_W = layout.screenWidth - layout.pagePaddingX * 2;
const CARD_H = Math.round(CARD_W * (9 / 16));

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: CARD_H,
    backgroundColor: colors.surface,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceHover,
  },
  quality: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  qualityText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  playFab: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  del: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    lineHeight: 21,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  expiry: {
    fontSize: 11,
    color: colors.mutedDim,
    fontWeight: "500",
  },
  expiryUrgent: { color: colors.gold },
  expiryExpired: { color: colors.error },
});
