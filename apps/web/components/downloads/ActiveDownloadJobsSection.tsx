"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Film, Loader2 } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { DownloadProgressBar } from "@/components/downloads/DownloadProgressBar";
import {
  groupDownloadRows,
  type GroupedDownloadItem,
} from "@/lib/downloads/group-download-rows";
import type { DownloadJob } from "@/lib/stores/download-progress.store";

type Props = {
  jobs: DownloadJob[];
};

function groupActiveJobs(jobs: DownloadJob[]): GroupedDownloadItem<DownloadJob>[] {
  return groupDownloadRows(jobs, {
    getContentId: (j) => j.contentId,
    getEpisodeId: (j) => j.episodeId,
    minEpisodesToGroup: 2,
  });
}

function ActiveJobCard({ job }: { job: DownloadJob }) {
  return (
    <div className="border border-brand-magenta/25 bg-brand-magenta/[0.06] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-14 w-24 shrink-0 overflow-hidden bg-black/40">
          {job.posterUrl ? (
            <MediaImage src={job.posterUrl} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film size={20} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={18} className="animate-spin text-brand-magenta" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{job.title}</p>
          <p className="mt-0.5 text-[12px] text-white/45">{job.phaseLabel}</p>
        </div>
      </div>
      <DownloadProgressBar progress={job.progress} label={job.phaseLabel} />
    </div>
  );
}

function ActiveJobSeriesGroup({ jobs }: { jobs: DownloadJob[] }) {
  const [expanded, setExpanded] = useState(jobs.length <= 2);
  const seriesTitle = jobs[0]?.title.split(" · ")[0] ?? "Série";
  const avgProgress = Math.round(
    jobs.reduce((sum, j) => sum + j.progress, 0) / Math.max(jobs.length, 1),
  );
  const posterUrl = jobs.find((j) => j.posterUrl)?.posterUrl;

  return (
    <div className="border border-brand-magenta/25 bg-brand-magenta/[0.06] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-14 w-24 shrink-0 overflow-hidden bg-black/40">
          {posterUrl ? (
            <MediaImage src={posterUrl} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film size={20} className="text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={18} className="animate-spin text-brand-magenta" />
          </div>
          <span className="absolute right-1 top-1 bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {jobs.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-white">{seriesTitle}</p>
          <p className="mt-0.5 text-[12px] text-white/45">
            {jobs.length} épisode{jobs.length > 1 ? "s" : ""} en cours
          </p>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Replier" : "Déplier"}
          className="shrink-0 p-1 text-white/50"
        >
          <ChevronDown
            size={18}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <DownloadProgressBar progress={avgProgress} label="Téléchargement en cours…" />
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-brand-magenta/15 pt-3">
          {jobs.map((job) => (
            <div key={job.key}>
              <p className="mb-1 truncate text-[12px] text-white/55">{job.title}</p>
              <DownloadProgressBar progress={job.progress} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveDownloadJobsSection({ jobs }: Props) {
  const grouped = useMemo(() => groupActiveJobs(jobs), [jobs]);

  if (jobs.length === 0) return null;

  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-magenta">
        En cours
      </h2>
      {grouped.map((entry) =>
        entry.kind === "series" ? (
          <ActiveJobSeriesGroup key={entry.contentId} jobs={entry.items} />
        ) : (
          <ActiveJobCard key={entry.item.key} job={entry.item} />
        ),
      )}
    </section>
  );
}
