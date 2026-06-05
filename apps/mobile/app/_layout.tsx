import { useEffect, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { PushBootstrap } from "@/components/PushBootstrap";
import { FontProvider } from "@/components/layout/FontProvider";
import { ErrorBoundary } from "@/presentation/providers/ErrorBoundary";
import { ToastHost } from "@/components/ui/IvodToast";
import { colors } from "@/theme/colors";
import { fontFamily } from "@/theme/typography";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadFromStorage);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadAuth();
    hydrateProfile();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isReady, isAuthenticated, segments]);

  const onFontsReady = useCallback(() => {
    Promise.resolve().finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <ErrorBoundary>
      <FontProvider onReady={onFontsReady}>
        <QueryClientProvider client={queryClient}>
          <PushBootstrap />
          <ToastHost />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.backgroundElevated },
              headerTintColor: colors.foreground,
              headerTitleStyle: { fontFamily: fontFamily.semiBold, fontWeight: "600" },
              contentStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(profiles)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="content/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="watch/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
            <Stack.Screen name="creator/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="catalog/[type]" options={{ headerShown: false }} />
            <Stack.Screen name="browse" options={{ headerShown: false }} />
            <Stack.Screen name="pricing" options={{ headerShown: false }} />
            <Stack.Screen name="recommendations" options={{ headerShown: false }} />
            <Stack.Screen name="following" options={{ headerShown: false }} />
            <Stack.Screen name="profiles/new" options={{ title: "Nouveau profil" }} />
            <Stack.Screen name="profiles/[id]/edit" options={{ title: "Modifier profil" }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </FontProvider>
    </ErrorBoundary>
  );
}
