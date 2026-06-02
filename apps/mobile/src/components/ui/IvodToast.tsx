import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Sparkles,
  X,
} from "lucide-react-native";
import { useToastStore, type ToastItem, type ToastVariant } from "@/store/toast.store";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

const META: Record<
  ToastVariant,
  { label: string; Icon: typeof CheckCircle2; accent: string; iconBg: string }
> = {
  success: {
    label: "Succès",
    Icon: CheckCircle2,
    accent: colors.success,
    iconBg: "rgba(52,211,153,0.15)",
  },
  error: {
    label: "Erreur",
    Icon: XCircle,
    accent: colors.magenta,
    iconBg: "rgba(230,0,126,0.15)",
  },
  warning: {
    label: "Attention",
    Icon: AlertTriangle,
    accent: colors.warning,
    iconBg: "rgba(251,191,36,0.12)",
  },
  info: {
    label: "Information",
    Icon: Info,
    accent: colors.gold,
    iconBg: "rgba(255,179,0,0.12)",
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const meta = META[item.variant];
  const Icon = meta.Icon;
  const slide = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, slide]);

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY: slide }] }]}
    >
      <LinearGradient
        colors={["rgba(123,0,153,0.12)", "rgba(0,5,13,0.92)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.topAccent, { backgroundColor: meta.accent }]} />
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: meta.iconBg, borderColor: `${meta.accent}55` }]}>
          <Icon color={meta.accent} size={18} strokeWidth={2.25} />
        </View>
        <View style={styles.copy}>
          <View style={styles.kickerRow}>
            <Sparkles size={10} color={colors.magenta} />
            <Text style={styles.kicker}>{item.title ?? meta.label}</Text>
          </View>
          <Text style={styles.message}>{item.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={12} style={styles.close}>
          <X color={colors.muted} size={16} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.progressBar}
      />
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <View style={[styles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 10,
    elevation: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  topAccent: { height: 2, width: "100%" },
  body: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.magenta,
  },
  message: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.88)",
  },
  close: { padding: 4, marginTop: 2 },
  progressBar: { height: 3, width: "100%" },
});
