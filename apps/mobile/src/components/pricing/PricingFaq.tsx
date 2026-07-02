import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import { PRICING_FAQ } from "@/core/pricing/constants";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={styles.wrap}>
      {PRICING_FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <View key={item.q} style={[styles.item, isOpen && styles.itemOpen]}>
            <TouchableOpacity
              style={styles.question}
              onPress={() => setOpen(isOpen ? null : i)}
              activeOpacity={0.8}
            >
              {isOpen ? (
                <GradientText style={styles.questionText}>{item.q}</GradientText>
              ) : (
                <Text style={styles.questionText}>{item.q}</Text>
              )}
              <ChevronDown
                size={18}
                color={isOpen ? colors.magenta : colors.mutedDim}
                style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
              />
            </TouchableOpacity>
            {isOpen ? <Text style={styles.answer}>{item.a}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginHorizontal: 16 },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  itemOpen: { borderColor: "rgba(230,0,126,0.25)" },
  question: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  questionText: { ...typography.body, flex: 1, fontWeight: "600" },
  answer: {
    ...typography.bodyMuted,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    lineHeight: 20,
  },
});
