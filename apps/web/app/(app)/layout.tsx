"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ViewerShell } from "@/components/layout/ViewerShell";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

function PushNotificationsMount() {
  usePushNotifications();
  return null;
}

/** Routes sans chrome (lecteur, sélection de profil) */
function isChromelessPath(pathname: string) {
  if (pathname.startsWith("/watch/")) return true;
  if (pathname === "/profiles" || pathname.startsWith("/profiles/")) return true;
  return false;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, isAuthenticated } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const chromeless = isChromelessPath(pathname);

  useEffect(() => {
    if (!hydrated || isAuthenticated) return;
    const redirect = encodeURIComponent(pathname);
    router.replace(`/auth/login?redirect=${redirect}`);
  }, [hydrated, isAuthenticated, router, pathname]);

  if (!hydrated) {
    return <BrandLoader />;
  }

  if (!isAuthenticated) return null;

  if (chromeless) {
    return (
      <>
        <PushNotificationsMount />
        {children}
      </>
    );
  }

  return (
    <ViewerShell showFooter={false} serverHasSession>
      <PushNotificationsMount />
      {children}
    </ViewerShell>
  );
}
