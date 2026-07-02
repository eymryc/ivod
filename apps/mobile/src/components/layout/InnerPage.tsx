import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { PageCanvas } from "./PageCanvas";
import { BackButton } from "./BackButton";

interface InnerPageProps {
  children: ReactNode;
  showBack?: boolean;
  minimal?: boolean;
}

/** Page stack sans header natif — fond premium + retour */
export function InnerPage({ children, showBack = true, minimal }: InnerPageProps) {
  return (
    <PageCanvas minimal={minimal}>
      {showBack ? <BackButton /> : null}
      <View style={styles.body}>{children}</View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
