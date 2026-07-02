import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Play, Trash2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DownloadEpisodeLabel } from "@/core/downloads/download-labels";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Props = {
  label: DownloadEpisodeLabel;
  meta?: string;
  hideSecondary?: boolean;
  onPress: () => void;
  onRemove: () => void;
  isLast?: boolean;
};

/** Ligne épisode — style Prime Video : compacte, lisible, sans redondance série. */
export function DownloadEpisodeRow({
  label,
  meta,
  hideSecondary = true,
  onPress,
  onRemove,
  isLast,
}: Props) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label.badge}</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {label.primary}
          </Text>
          {!hideSecondary && label.secondary ? (
            <Text style={styles.secondary} numberOfLines={1}>
              {label.secondary}
            </Text>
          ) : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} style={styles.play} activeOpacity={0.85}>
        <LinearGradient
          colors={[...gradients.primaryBtn]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.playGrad}
        >
          <Play color="#fff" size={14} fill="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={onRemove} style={styles.del} hitSlop={8}>
        <Trash2 color={colors.mutedDim} size={17} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingLeft: 14,
    paddingRight: 8,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  badge: {
    minWidth: 52,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(230,0,126,0.1)",
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.22)",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.magenta,
    letterSpacing: 0.6,
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
  },
  secondary: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 1,
  },
  meta: {
    fontSize: 11,
    color: colors.mutedDim,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  play: { marginLeft: 4 },
  playGrad: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  del: { padding: 10, marginLeft: 2 },
});
