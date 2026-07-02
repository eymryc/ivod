import { Suspense } from "react";
import type { Metadata } from "next";
import { ViewerShell } from "@/components/layout/ViewerShell";
import { hasServerAccessToken } from "@/lib/auth/server-session";
import { HomepageClient } from "./homepage-client";

export const metadata: Metadata = {
  title: "iVOD — Films & Séries africains",
  description:
    "Découvrez les meilleurs films africains, séries et web-séries en streaming. Pass 24h dès 150 FCFA ou Premium à 1 500 FCFA/mois.",
};

export default async function HomePage() {
  const serverHasSession = await hasServerAccessToken();
  return (
    <ViewerShell mainOffsetTop={false} serverHasSession={serverHasSession}>
      <Suspense fallback={<div className="h-screen bg-surface animate-pulse" />}>
        <HomepageClient />
      </Suspense>
    </ViewerShell>
  );
}
