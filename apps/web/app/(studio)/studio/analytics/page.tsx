"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Clock,
  TrendingUp,
  CheckSquare,
  ArrowRight,
  Heart,
  Star,
  Clapperboard,
  BarChart3,
} from "lucide-react";
import { creatorsApi } from "@/lib/api/creators";
import { StatsChart } from "@/components/studio/StatsChart";
import {
  StudioPageHeader,
  StudioKpiCard,
  StudioPanel,
  StudioPeriodPills,
  StudioLoading,
  StudioEmpty,
} from "@/components/studio/StudioShell";
import { formatCount } from "@/lib/utils/format";
import { assetUrl } from "@/lib/utils/assets";
import {
  type CreatorAnalytics,
  formatChartDate,
} from "@/lib/types/creator-analytics";

const PERIODS = [
  { code: "7d", label: "7 jours" },
  { code: "30d", label: "30 jours" },
  { code: "90d", label: "90 jours" },
] as const;

type Period = (typeof PERIODS)[number]["code"];

function TopContentRow({
  rank,
  item,
}: {
  rank: number;
  item: CreatorAnalytics["topContents"][0];
}) {
  const poster = assetUrl(item.thumbnailObjectKey);
  const completionPct = Math.round((item.completionRate ?? 0) * 100);

  return (
    <li>
      <Link
        href={`/studio/contents/${item.id}`}
        className="group relative flex items-center gap-4 py-3.5 -mx-2 px-2 rounded-none hover:bg-primary/[0.04] transition-colors"
      >
        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-lg font-semibold text-white/12 w-6 shrink-0 tabular-nums text-center">
          {rank}
        </span>
        <div className="relative w-10 h-[60px] shrink-0 rounded-none overflow-hidden ring-1 ring-white/[0.08] bg-white/[0.02]">
          {poster ? (
            <Image src={poster} alt="" fill className="object-cover" sizes="40px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/15">
              <Clapperboard size={14} strokeWidth={1.25} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[13px] font-medium text-white/90 truncate group-hover:text-primary transition-colors">
            {item.title}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary/80 rounded-full"
                style={{ width: `${Math.min(completionPct, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-white/30 shrink-0 tabular-nums">{completionPct}%</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-white/30 font-light">
            <span className="inline-flex items-center gap-1">
              <Eye size={10} /> {formatCount(item.viewCount)} vues
            </span>
            {(item.likeCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Heart size={10} /> {formatCount(item.likeCount ?? 0)}
              </span>
            )}
            {(item.avgRating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-secondary/70">
                <Star size={10} className="fill-secondary/40" /> {item.avgRating?.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <ArrowRight
          size={14}
          className="text-white/15 group-hover:text-primary shrink-0 transition-colors"
        />
      </Link>
    </li>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["creator-analytics", period],
    queryFn: () => creatorsApi.getMyAnalytics(period) as Promise<CreatorAnalytics | null>,
    staleTime: 5 * 60_000,
  });

  const periodLabel = PERIODS.find((p) => p.code === period)?.label ?? period;

  const viewsData = useMemo(
    () =>
      stats?.dailyViews?.map((d) => ({
        label: formatChartDate(d.date),
        value: d.views,
      })) ?? [],
    [stats?.dailyViews],
  );

  const watchTimeData = useMemo(
    () =>
      stats?.dailyWatchTime?.map((d) => ({
        label: formatChartDate(d.date),
        value: Math.round(d.watchTimeSec / 3600),
      })) ?? [],
    [stats?.dailyWatchTime],
  );

  const hasCharts = viewsData.some((d) => d.value > 0) || watchTimeData.some((d) => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <StudioPageHeader
        title="Statistiques"
        subtitle={
          stats
            ? `${stats.totalContents} titre${stats.totalContents > 1 ? "s" : ""} publié${stats.totalContents > 1 ? "s" : ""} · ${periodLabel}`
            : "Performance de votre catalogue"
        }
        action={
          <StudioPeriodPills options={PERIODS} value={period} onChange={setPeriod} />
        }
      />

      {isLoading ? (
        <StudioLoading />
      ) : !stats ? (
        <StudioEmpty
          icon={BarChart3}
          title="Statistiques indisponibles"
          description="Vérifiez que votre compte créateur est actif."
        />
      ) : (
        <div className="space-y-6">
          {/* Bandeau période */}
          <div className="rounded-none border border-white/[0.06] bg-gradient-to-r from-primary/[0.04] to-transparent px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-white/50 font-light">
              Vues sur la période{" "}
              <span className="text-primary font-medium tabular-nums">
                {formatCount(stats.recentViews)}
              </span>
              {" "}· catalogue{" "}
              <span className="text-white/70 tabular-nums">{formatCount(stats.totalViews)}</span> vues cumulées
            </p>
            {stats.avgRating > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-secondary/80">
                <Star size={12} className="fill-secondary/40" />
                Note moy. {stats.avgRating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StudioKpiCard
              label="Vues période"
              value={formatCount(stats.recentViews)}
              sub={periodLabel}
              icon={Eye}
            />
            <StudioKpiCard
              label="Temps regardé"
              value={`${stats.totalWatchHours}h`}
              sub="Cumul catalogue"
              icon={Clock}
            />
            <StudioKpiCard
              label="Complétion"
              value={`${Math.round(stats.avgCompletionRate * 100)}%`}
              sub="Moyenne publiés"
              icon={CheckSquare}
              accent="secondary"
            />
            <StudioKpiCard
              label="Likes"
              value={formatCount(stats.totalLikes)}
              sub={`${stats.totalContents} contenu${stats.totalContents > 1 ? "s" : ""}`}
              icon={TrendingUp}
              accent="emerald"
            />
          </div>

          {hasCharts ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <StudioPanel title={`Vues — ${periodLabel}`}>
                <StatsChart data={viewsData} type="area" color="#f97316" unit="vues" height={220} />
              </StudioPanel>
              <StudioPanel title={`Heures regardées — ${periodLabel}`}>
                <StatsChart data={watchTimeData} type="bar" color="#eab308" unit="h" height={220} />
              </StudioPanel>
            </div>
          ) : (
            <StudioPanel title="Activité">
              <StudioEmpty
                icon={BarChart3}
                title="Pas encore de données sur cette période"
                description="Les graphiques apparaîtront dès les premières vues sur vos contenus publiés."
              />
            </StudioPanel>
          )}

          {stats.topContents.length > 0 ? (
            <StudioPanel title="Classement contenus">
              <ul className="divide-y divide-white/[0.04]">
                {stats.topContents.map((c, i) => (
                  <TopContentRow key={c.id} rank={i + 1} item={c} />
                ))}
              </ul>
            </StudioPanel>
          ) : (
            <StudioPanel title="Classement contenus">
              <StudioEmpty
                icon={Clapperboard}
                title="Aucun contenu publié"
                description="Publiez au moins un titre pour voir le classement."
              />
            </StudioPanel>
          )}
        </div>
      )}
    </div>
  );
}
