import { useEffect, useCallback, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryFocusSetup } from "@/presentation/providers/query-focus";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/store/auth.store";
import { useProfileStore } from "@/store/profile.store";
import { PushBootstrap } from "@/components/PushBootstrap";
import { FontProvider } from "@/components/layout/FontProvider";
import { ErrorBoundary } from "@/presentation/providers/ErrorBoundary";
import { ToastHost } from "@/components/ui/IvodToast";
import { isAuthRequiredPath, needsActiveProfile } from "@/core/navigation/route-access";
import { colors } from "@/theme/colors";
import { fontFamily } from "@/theme/typography";

SplashScreen.preventAutoHideAsync().catch(() => undefined);
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadFromStorage);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadAuth();
    hydrateProfile();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    const needsAuth = isAuthRequiredPath(segments as string[]);

    if (!isAuthenticated && needsAuth) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace(activeProfileId ? "/(tabs)" : "/(profiles)/select");
      return;
    }

    if (
      isAuthenticated &&
      profileHydrated &&
      !activeProfileId &&
      needsActiveProfile(segments as string[])
    ) {
      router.replace("/(profiles)/select");
    }
  }, [isReady, isAuthenticated, activeProfileId, profileHydrated, segments, router]);

  const splashHidden = useRef(false);
  const onFontsReady = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <ErrorBoundary>
      <FontProvider onReady={onFontsReady}>
        <QueryClientProvider client={queryClient}>
          <QueryFocusSetup />
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
            <Stack.Screen name="profiles/new" options={{ headerShown: false }} />
            <Stack.Screen name="profiles/[id]/edit" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="payment/callback" options={{ headerShown: false, title: "Paiement" }} />
          </Stack>
        </QueryClientProvider>
      </FontProvider>
    </ErrorBoundary>
  );
}
