import { Suspense } from "react";
import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ViewerShell } from "@/components/layout/ViewerShell";
import { hasServerAccessToken } from "@/lib/auth/server-session";
import { getQueryClient } from "@/lib/query/get-query-client";
import { prefetchHomeCatalog } from "@/lib/catalog/prefetch-home-catalog";
import { HomepageClient } from "./homepage-client";

export const metadata: Metadata = {
  title: "iVOD — Films & Séries africains",
  description:
    "Découvrez les meilleurs films africains, séries et web-séries en streaming. Pass 24h dès 150 FCFA ou Premium à 1 500 FCFA/mois.",
};

export default async function HomePage() {
  const serverHasSession = await hasServerAccessToken();
  const queryClient = getQueryClient();
  await prefetchHomeCatalog(queryClient);

  return (
    <ViewerShell mainOffsetTop={false} serverHasSession={serverHasSession}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<div className="h-screen bg-surface animate-pulse" />}>
          <HomepageClient />
        </Suspense>
      </HydrationBoundary>
    </ViewerShell>
  );
}
