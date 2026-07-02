"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  HardDrive,
  Lock,
  Smartphone,
} from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { downloadsApi, type DownloadPackage } from "@/lib/api/downloads";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { posterUrl } from "@/lib/utils/assets";
import { formatRelative } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { PAGE_X } from "@/components/public/PublicShell";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { DownloadProgressBar } from "@/components/downloads/DownloadProgressBar";
import { DownloadItemCard } from "@/components/downloads/DownloadItemCard";
import { DownloadSeriesGroup } from "@/components/downloads/DownloadSeriesGroup";
import { ActiveDownloadJobsSection } from "@/components/downloads/ActiveDownloadJobsSection";
import { useDownloadProgressStore } from "@/lib/stores/download-progress.store";
import {
  compareEpisodeDownloads,
  groupDownloadRows,
  type GroupedDownloadItem,
} from "@/lib/downloads/group-download-rows";

type DownloadRow = DownloadPackage & {
  id: string;
  content?: {
    id: string;
    title?: string;
    duration?: number;
    thumbnailObjectKey?: string | null;
  };
  episode?: {
    id?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  };
  episodeId?: string | null;
  expiresAt?: string;
  quality?: string;
};

function resolveThumb(row: DownloadRow): string | null {
  if (!row.content) return null;
  return posterUrl(row.content);
}

function resolveSeriesTitle(row: DownloadRow): string {
  return row.content?.title ?? row.title ?? "Série";
}

function resolveEpisodeTitle(row: DownloadRow): string {
  if (row.episode) {
    const epLabel = `S${row.episode.seasonNumber} · Ép. ${row.episode.episodeNumber}`;
    if (row.episode.title?.trim()) {
      return `${epLabel} — ${row.episode.title.trim()}`;
    }
    return epLabel;
  }
  return resolveSeriesTitle(row);
}

function resolveSingleTitle(row: DownloadRow): string {
  const epId = row.episodeId ?? row.episode?.id;
  if (epId) return resolveEpisodeTitle(row);
  return resolveSeriesTitle(row);
}

function resolveWatchHref(row: DownloadRow): string {
  const id = row.content?.id ?? row.contentId;
  const epId = row.episodeId ?? row.episode?.id;
  if (epId) return `/watch/${id}?ep=${epId}`;
  return `/watch/${id}`;
}

function groupRows(rows: DownloadRow[]): GroupedDownloadItem<DownloadRow>[] {
  return groupDownloadRows(rows, {
    getContentId: (r) => r.content?.id ?? r.contentId,
    getEpisodeId: (r) => r.episodeId ?? r.episode?.id,
    compareEpisodes: compareEpisodeDownloads,
    minEpisodesToGroup: 2,
  });
}

function DownloadListSection({
  grouped,
  now,
  variant,
  onRemove,
  isRemoving,
}: {
  grouped: GroupedDownloadItem<DownloadRow>[];
  now: number;
  variant: "active" | "expired";
  onRemove: (id: string) => void;
  isRemoving?: boolean;
}) {
  return (
    <div className={variant === "active" ? "space-y-3" : "space-y-2"}>
      {grouped.map((entry) => {
        if (entry.kind === "series") {
          const first = entry.items[0];
          return (
            <DownloadSeriesGroup
              key={entry.contentId}
              contentId={entry.contentId}
              seriesTitle={resolveSeriesTitle(first)}
              thumb={resolveThumb(first)}
              items={entry.items}
              now={now}
              variant={variant}
              resolveEpisodeTitle={resolveEpisodeTitle}
              resolveWatchHref={resolveWatchHref}
              onRemove={onRemove}
              isRemoving={isRemoving}
            />
          );
        }

        const row = entry.item;
        return (
          <DownloadItemCard
            key={row.id}
            row={row}
            thumb={resolveThumb(row)}
            title={resolveSingleTitle(row)}
            watchHref={resolveWatchHref(row)}
            now={now}
            variant={variant === "expired" ? "expired" : "default"}
            onRemove={onRemove}
            isRemoving={isRemoving}
          />
        );
      })}
    </div>
  );
}

export function DownloadsScreen() {
  const qc = useQueryClient();
  const jobsMap = useDownloadProgressStore((s) => s.jobs);
  const activeJobs = useMemo(
    () =>
      Object.values(jobsMap).filter(
        (j) => j.phase !== "complete" && j.phase !== "error",
      ),
    [jobsMap],
  );

  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    staleTime: 5 * 60_000,
  });

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["downloads"],
    queryFn: downloadsApi.list,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => downloadsApi.remove(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["downloads"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const planDetails = (currentSub as { planDetails?: { maxOfflineDownloads?: number } })?.planDetails;
  const maxDownloads = planDetails?.maxOfflineDownloads ?? 0;
  const hasDownloadAccess = maxDownloads > 0;

  const items = (downloads ?? []) as DownloadRow[];
  const now = Date.now();
  const active = items.filter((d) => !d.expiresAt || new Date(d.expiresAt).getTime() > now);
  const expired = items.filter((d) => d.expiresAt && new Date(d.expiresAt).getTime() <= now);

  const groupedActive = useMemo(() => groupRows(active), [active]);
  const groupedExpired = useMemo(() => groupRows(expired), [expired]);

  const quotaPct = useMemo(
    () => (maxDownloads > 0 ? Math.min((active.length / maxDownloads) * 100, 100) : 0),
    [active.length, maxDownloads],
  );

  const handleRemove = (id: string) => removeMutation.mutate(id);

  if (!hasDownloadAccess) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute top-1/4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-purple/15 blur-[100px]" />
        </div>
        <div className={`relative flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center ${PAGE_X}`}>
          <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.04]">
            <Lock size={28} className="text-white/40" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Téléchargements réservés</h1>
            <p className="mt-2 max-w-sm text-sm text-white/45">
              Les téléchargements offline sont inclus avec un pass ou l&apos;abonnement Premium.
            </p>
          </div>
          <Link
            href="/settings/subscription"
            className="ivod-btn ivod-btn-primary px-6 py-3 text-sm font-semibold"
          >
            Voir les abonnements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 right-[12%] h-80 w-80 rounded-full bg-brand-magenta/[0.1] blur-[130px]" />
        <div className="absolute top-40 left-[8%] h-64 w-64 rounded-full bg-brand-purple/[0.12] blur-[100px]" />
      </div>

      <div className={`relative ${PAGE_X} py-10 md:py-14 pb-20`}>
        <header className="mb-8 md:mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] ivod-gradient-text">
            Lecture hors ligne
          </p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center border border-white/[0.12] bg-white/[0.04]">
                <div className="absolute inset-0 ivod-gradient opacity-[0.18]" />
                <Download size={26} className="relative text-brand-magenta" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Téléchargements
                </h1>
                <p className="mt-1.5 text-sm text-white/45">
                  {active.length} / {maxDownloads} licence{maxDownloads > 1 ? "s" : ""} utilisée{maxDownloads > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-none border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12px] text-white/55">
              <Smartphone size={16} className="shrink-0 text-brand-gold" />
              <span>La lecture hors ligne se fait sur l&apos;app mobile iVOD.</span>
            </div>
          </div>
          <div className="mt-6 ivod-line-accent w-16" />

          <div className="mt-6 max-w-xl">
            <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-white/40">
              <span>Espace utilisé</span>
              <span className={quotaPct >= 100 ? "text-red-400" : "text-white/55"}>
                {active.length} / {maxDownloads}
              </span>
            </div>
            <DownloadProgressBar progress={quotaPct} size="sm" />
          </div>
        </header>

        <ActiveDownloadJobsSection jobs={activeJobs} />

        {isLoading ? (
          <BrandLoader fullScreen={false} size="md" tagline="Téléchargements" className="py-12" />
        ) : items.length === 0 && activeJobs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center md:py-28">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center border border-white/[0.1] bg-white/[0.03]">
              <div className="absolute inset-0 ivod-gradient opacity-10" />
              <HardDrive size={32} className="relative text-white/25" strokeWidth={1.25} />
            </div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">Aucun téléchargement</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
              Ajoutez des films ou des épisodes depuis leur fiche — les licences apparaîtront ici.
            </p>
            <Link
              href="/films"
              className="ivod-btn ivod-btn-primary mt-8 inline-flex items-center gap-2 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            >
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Disponibles ({active.length})
                </h2>
                <DownloadListSection
                  grouped={groupedActive}
                  now={now}
                  variant="active"
                  onRemove={handleRemove}
                  isRemoving={removeMutation.isPending}
                />
              </section>
            )}

            {expired.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Expirés ({expired.length})
                </h2>
                <DownloadListSection
                  grouped={groupedExpired}
                  now={now}
                  variant="expired"
                  onRemove={handleRemove}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
