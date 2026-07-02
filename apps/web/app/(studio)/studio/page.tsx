"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Users, Heart, TrendingUp, Film, Plus } from "lucide-react";
import { creatorsApi } from "@/lib/api/creators";
import { StatsChart } from "@/components/studio/StatsChart";
import {
  StudioKpiCard,
  StudioPanel,
  StudioPanelLink,
  StudioLoading,
  StudioEmpty,
  StudioPrimaryButton,
} from "@/components/studio/StudioShell";
import { StudioContentCard } from "@/components/studio/StudioContentCard";
import { StudioDashboardHero } from "@/components/studio/StudioDashboardHero";
import { StudioTopContentList } from "@/components/studio/StudioTopContentList";
import { StudioStatusAlerts } from "@/components/studio/StudioStatusAlerts";
import { formatCount } from "@/lib/utils/format";
import type { CreatorContentListItem } from "@/lib/types/studio-content";
import { type CreatorAnalytics, formatChartDate } from "@/lib/types/creator-analytics";

export default function StudioDashboard() {
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["creator-me"],
    queryFn: creatorsApi.getMe,
    staleTime: 5 * 60_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["creator-analytics", "30d"],
    queryFn: () => creatorsApi.getMyAnalytics("30d") as Promise<CreatorAnalytics | null>,
    staleTime: 5 * 60_000,
  });

  const { data: recentContents } = useQuery({
    queryKey: ["creator-contents", { page: 1, limit: 5 }],
    queryFn: () => creatorsApi.getMyContents({ page: 1, limit: 5 }),
    staleTime: 2 * 60_000,
    refetchOnMount: "always",
  });

  const { data: statsData } = useQuery({
    queryKey: ["creator-contents-stats"],
    queryFn: () => creatorsApi.getMyContents({ page: 1, limit: 200 }),
    staleTime: 60_000,
  });

  const statusCounts = useMemo(() => {
    const all: CreatorContentListItem[] =
      (statsData as { items?: CreatorContentListItem[] })?.items ?? [];
    const counts: Record<string, number> = {};
    for (const c of all) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [statsData]);

  if (meLoading || statsLoading) {
    return (
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <StudioLoading />
      </div>
    );
  }

  const viewsData =
    stats?.dailyViews?.map((d) => ({
      label: formatChartDate(d.date),
      value: d.views,
    })) ?? [];

  const hasViewActivity = viewsData.some((d) => d.value > 0);

  const items: CreatorContentListItem[] =
    (recentContents as { items?: CreatorContentListItem[] })?.items ?? [];

  const stageName = me?.stageName ?? "Créateur";
  const totalContents = stats?.totalContents ?? items.length;

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-6 sm:py-8">
      <StudioDashboardHero
        stageName={stageName}
        totalContents={totalContents}
        periodLabel="30 derniers jours"
      />

      <StudioStatusAlerts
        drafts={statusCounts.DRAFT ?? 0}
        pending={statusCounts.PENDING_REVIEW ?? 0}
        rejected={statusCounts.REJECTED ?? 0}
      />

      {/* KPI — carte principale + métriques secondaires */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="col-span-2 lg:col-span-5">
          <StudioKpiCard
            label="Vues (30j)"
            value={formatCount(stats?.recentViews ?? 0)}
            sub={`${formatCount(stats?.totalViews ?? 0)} vues cumulées`}
            icon={Eye}
            accent="primary"
            featured
          />
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-3 lg:col-span-7 lg:gap-4">
          <StudioKpiCard
            label="Abonnés"
            value={formatCount(me?.subscriberCount ?? 0)}
            icon={Users}
            accent="emerald"
          />
          <StudioKpiCard
            label="Likes"
            value={formatCount(stats?.totalLikes ?? 0)}
            sub="Publiés"
            icon={Heart}
            accent="secondary"
          />
          <StudioKpiCard
            label="Temps regardé"
            value={`${stats?.totalWatchHours ?? 0}h`}
            sub="Catalogue"
            icon={TrendingUp}
            accent="primary"
          />
        </div>
      </div>

      {/* Analytique + top contenus côte à côte */}
      <div className="mb-6 grid gap-4 lg:grid-cols-5 lg:gap-5">
        <StudioPanel
          title="Audience — 30 jours"
          className="lg:col-span-3"
          action={<StudioPanelLink href="/studio/analytics">Détails</StudioPanelLink>}
        >
          {hasViewActivity ? (
            <StatsChart data={viewsData} type="area" color="#e11d8f" unit="vues" height={220} />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <p className="text-[13px] text-white/45">Pas encore de vues sur la période</p>
              <p className="mt-1 max-w-xs text-[11px] text-white/25">
                Publiez et partagez vos contenus pour suivre l&apos;audience ici.
              </p>
            </div>
          )}
        </StudioPanel>

        <StudioPanel
          title="Top contenus"
          className="lg:col-span-2"
          action={<StudioPanelLink href="/studio/analytics">Statistiques</StudioPanelLink>}
        >
          <StudioTopContentList items={stats?.topContents ?? []} />
        </StudioPanel>
      </div>

      {/* Activité récente — format compact */}
      <StudioPanel
        title="Activité récente"
        action={<StudioPanelLink href="/studio/contents">Tout le catalogue</StudioPanelLink>}
      >
        {items.length === 0 ? (
          <StudioEmpty
            icon={Film}
            title="Aucun contenu pour le moment"
            description="Publiez votre première fiche pour alimenter le catalogue."
            action={
              <StudioPrimaryButton href="/studio/contents/new" icon={Plus}>
                Créer un contenu
              </StudioPrimaryButton>
            }
          />
        ) : (
          <div className="-mx-1">
            {items.map((c) => (
              <StudioContentCard key={c.id} content={c} compact />
            ))}
          </div>
        )}
      </StudioPanel>
    </div>
  );
}
