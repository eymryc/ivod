import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { colors } from "@/theme/colors";

export default function BootstrapScreen() {
  const isReady = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  if (!isReady || !profileHydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.magenta} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(tabs)" />;
  if (!activeProfileId) return <Redirect href="/(profiles)/select" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
