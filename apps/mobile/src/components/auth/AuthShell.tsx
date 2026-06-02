import type { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const MAX_FORM_WIDTH = 440;

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shell auth centré — aligné web app/auth/layout.tsx */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <PageCanvas style={styles.canvas}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLine}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.brandBlock}>
              <BrandLogo size="md" />
              <GradientText style={styles.kicker}>Cinéma & séries africains</GradientText>
              <AccentLine width={48} style={styles.accent} />
            </View>

            <View style={styles.titles}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <PremiumPanel style={styles.panel}>{children}</PremiumPanel>

            <Text style={styles.copyright}>© {new Date().getFullYear()} iVOD</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  flex: { flex: 1 },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: layout.pagePaddingX,
    paddingVertical: 32,
    minHeight: layout.screenHeight * 0.85,
  },
  column: {
    width: "100%",
    maxWidth: MAX_FORM_WIDTH,
    alignItems: "center",
    gap: 20,
  },
  brandBlock: {
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2.4,
    marginTop: 4,
  },
  accent: { marginVertical: 0 },
  titles: {
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  panel: {
    width: "100%",
    marginHorizontal: 0,
    marginBottom: 0,
  },
  copyright: {
    ...typography.caption,
    color: "rgba(255,255,255,0.25)",
    marginTop: 8,
  },
});
