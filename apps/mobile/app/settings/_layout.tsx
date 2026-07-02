import { Stack } from "expo-router";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function SettingsLayout() {
  return (
    <SettingsShell>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="history" />
        <Stack.Screen name="devices" />
        <Stack.Screen name="login-history" />
        <Stack.Screen name="security" />
        <Stack.Screen name="parental" />
        <Stack.Screen name="privacy" />
      </Stack>
    </SettingsShell>
  );
}
