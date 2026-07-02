import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { layout } from "@/theme/layout";
import { colors } from "@/theme/colors";

const CARD_W = 120;
const CARD_H = CARD_W * 1.5;

function ShimmerCard({ delay = 0 }: { delay?: number }) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View style={[styles.card, { opacity: anim }]}>
      <View style={styles.cardInner} />
    </Animated.View>
  );
}

export function ContentRowSkeleton({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <View style={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerCard key={i} delay={i * 100} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: layout.sectionGap - 4 },
  row: {
    flexDirection: "row",
    paddingHorizontal: layout.pagePaddingX,
    gap: 10,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
