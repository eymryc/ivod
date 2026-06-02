import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { colors } from "@/theme/colors";

export interface AdConfig {
  id?: string;
  type?: string;
  url?: string;
  link?: string;
  skipAfter?: number;
  message?: string;
}

interface Props {
  ad: AdConfig;
  onComplete: () => void;
}

export function AdOverlay({ ad, onComplete }: Props) {
  const skipAfter = ad.skipAfter ?? 5;
  const [remaining, setRemaining] = useState(skipAfter);

  useEffect(() => {
    if (skipAfter <= 0) {
      onComplete();
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [skipAfter, onComplete]);

  return (
    <View style={styles.wrap}>
      {ad.url && ad.type === "image" ? (
        <Image source={{ uri: ad.url }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
      ) : null}
      <View style={styles.content}>
        <Text style={styles.brand}>iVOD</Text>
        <Text style={styles.msg}>
          {ad.message ??
            "Contenu AVOD — publicité. Passez Premium pour regarder sans pub."}
        </Text>
        {skipAfter > 0 ? (
          <Text style={styles.timer}>Lecture dans {remaining}s</Text>
        ) : null}
        <TouchableOpacity style={styles.skip} onPress={onComplete}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "#06060a", zIndex: 30 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  brand: { fontSize: 28, fontWeight: "800", color: colors.magenta },
  msg: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 },
  timer: { fontSize: 13, color: colors.foreground },
  skip: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  skipText: { color: colors.foreground, fontWeight: "600" },
});
