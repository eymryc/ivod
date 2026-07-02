"use client";

import Link from "next/link";
import { MediaImage } from "@/components/ui/MediaImage";
import { posterUrl } from "@/lib/utils/assets";
import { formatDuration, formatRelative } from "@/lib/utils/format";
import { isVideoPlayable } from "@/lib/utils/video";
import { adminWatchHref } from "@/lib/utils/admin-watch";
import { CONTENT_STATUS_UI } from "@/components/admin/AdminShell";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Globe,
  Video,
  Play,
  Loader2,
  Tag,
} from "lucide-react";
import { isSeriesContentType, resolveContentTypeCode } from "@/lib/utils/content-type";
import type { AdminContentListItem, AdminEpisodeModerationItem } from "@/lib/types/admin-content";

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-none border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">{label}</p>
      <div className="text-[13px] leading-snug text-white/85">{children}</div>
    </div>
  );
}

type Props = {
  content: AdminContentListItem;
  showModerationActions?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onWatch: () => void;
  watchReturnPath?: string;
  approving?: boolean;
  onApproveEpisode?: (episodeId: string) => void;
  onRejectEpisode?: (episodeId: string) => void;
  onWatchEpisode?: (episodeId: string) => void;
  approvingEpisodeId?: string | null;
};

function groupEpisodesBySeason(episodes: AdminEpisodeModerationItem[]) {
  const map = new Map<number, AdminEpisodeModerationItem[]>();
  for (const ep of episodes) {
    const list = map.get(ep.seasonNumber) ?? [];
    list.push(ep);
    map.set(ep.seasonNumber, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

export function AdminContentDetailPanel({
  content: c,
  showModerationActions,
  onApprove,
  onReject,
  onWatch,
  watchReturnPath,
  approving,
  onApproveEpisode,
  onRejectEpisode,
  onWatchEpisode,
  approvingEpisodeId,
}: Props) {
  const statusCode = c.status?.code ?? "";
  const typeCode = resolveContentTypeCode(c);
  const isSeries = isSeriesContentType(typeCode);
  const episodes = c.episodes ?? [];
  const episodesBySeason = groupEpisodesBySeason(episodes);
  const statusUi = CONTENT_STATUS_UI[statusCode] ?? {
    label: c.status?.label ?? statusCode,
    dot: "bg-white/35",
    text: "text-white/45",
  };
  const thumb = posterUrl(c as Parameters<typeof posterUrl>[0]);
  const video = c.videoAssets?.[0];
  const videoReady = c.canPlayVideo === true || isVideoPlayable(video?.status);
  const videoStatusLabel =
    video?.status === "READY_PREVIEW"
      ? "Aperçu prêt"
      : video?.status === "READY" || video?.status === "PUBLISHED"
        ? "Prête"
        : video?.status ?? null;
  const genres = (c.contentGenres ?? []).map((g) => g.genre?.label).filter(Boolean);

  return (
    <article className="overflow-hidden rounded-none border border-white/[0.08] bg-white/[0.015] ring-1 ring-primary/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-white">{c.title}</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium ${statusUi.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusUi.dot}`} />
              {statusUi.label}
            </span>
            {c.isExclusive && (
              <span className="rounded-none border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                Exclusif
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-white/40">
            {c.creator?.stageName ?? "—"}
            {c.creator?.verified && " · Vérifié"}
            {" · "}
            {formatRelative(c.createdAt)}
            {c.slug && <span className="font-mono text-white/25"> · /content/{c.slug}</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-5 py-3">
        <Link
          href={`/content/${c.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-none border border-white/10 px-3 py-2 text-[12px] text-white/70 hover:border-primary/30 hover:text-primary"
        >
          <Eye size={14} />
          Fiche publique
        </Link>
        <Link
          href={adminWatchHref(c, watchReturnPath)}
          className="inline-flex items-center gap-1.5 rounded-none border border-primary/25 bg-primary/10 px-3 py-2 text-[12px] font-medium text-primary hover:bg-primary/15"
        >
          <Play size={14} />
          Lecteur
        </Link>
        <Link
          href={`/admin/contents/${c.id}/geo`}
          className="inline-flex items-center gap-1.5 rounded-none border border-white/10 px-3 py-2 text-[12px] text-white/50 hover:border-primary/30 hover:text-primary"
        >
          <Globe size={14} />
          Géo
        </Link>
        {showModerationActions && (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isSeries ? "Publier le catalogue" : "Approuver"}
            </button>
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center gap-1.5 rounded-none border border-red-500/30 bg-red-500/15 px-4 py-2 text-[12px] font-medium text-red-300 hover:bg-red-500/20"
            >
              <XCircle size={14} />
              Rejeter
            </button>
          </>
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[200px_1fr]">
        <div className="space-y-3">
          <div className="relative mx-auto aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-none border border-white/10 bg-black lg:mx-0">
            <MediaImage src={thumb} alt={c.title} fill className="object-cover" sizes="200px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {videoReady ? (
              <button
                type="button"
                onClick={onWatch}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 hover:bg-black/25"
                aria-label={`Lire ${c.title}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-black/55 text-white shadow-lg transition-transform hover:scale-105">
                  <Play size={24} className="ml-0.5 fill-white" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                  Lire
                </span>
              </button>
            ) : (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-3 text-center">
                <p className="text-[11px] text-white/50">
                  Vidéo {video?.status ? `(${video.status})` : "indisponible"}
                </p>
              </div>
            )}
          </div>
          <span
            className={`flex w-full max-w-[200px] items-center justify-center gap-2 rounded-none border px-3 py-2 text-[12px] font-medium ${
              videoReady
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.03] text-white/40"
            }`}
          >
            <Video size={14} />
            {videoReady
              ? `${videoStatusLabel ?? "Prête"}${video?.height ? ` · ${video.height}p` : ""}`
              : `Vidéo : ${video?.status ?? "absente"}`}
          </span>
        </div>

        <div className="min-w-0 space-y-4">
          <p className="text-[12px] text-white/45">
            {c.contentType?.label}
            {c.visibility?.label ? ` · ${c.visibility.label}` : ""}
            {c.maturityRating?.label ? ` · ${c.maturityRating.label}` : ""}
            {c.previewEpisodeId ? " · Épisode de prévisualisation" : ""}
          </p>

          {c.shortDescription && (
            <p className="text-[14px] leading-relaxed text-white/80">{c.shortDescription}</p>
          )}

          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:grid-cols-3">
            <MetaItem label="Année">{c.releaseYear ?? "—"}</MetaItem>
            <MetaItem label="Durée">
              {c.duration
                ? formatDuration(c.duration)
                : video?.duration
                  ? formatDuration(video.duration)
                  : "—"}
            </MetaItem>
            <MetaItem label="Vues / likes">
              {(c.viewCount ?? 0).toLocaleString("fr-FR")} / {(c.likeCount ?? 0).toLocaleString("fr-FR")}
            </MetaItem>
            {(c._count?.episodes ?? 0) > 0 && (
              <MetaItem label="Série">
                {c._count?.seasons ?? 0} saison(s) · {c._count?.episodes ?? 0} épisode(s)
                {typeof c.publishedEpisodeCount === "number"
                  ? ` · ${c.publishedEpisodeCount} publié(s)`
                  : ""}
              </MetaItem>
            )}
            <MetaItem label="Ayant droit">{c.primaryRightsholder?.displayName ?? "—"}</MetaItem>
            <MetaItem label="Distributeur">{c.distributor?.displayName ?? "—"}</MetaItem>
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Tag size={14} className="shrink-0 text-white/30" />
              {genres.map((g) => (
                <span
                  key={g}
                  className="rounded-none border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {c.description && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-primary/60">
                Synopsis
              </p>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/70">{c.description}</p>
            </div>
          )}

          {statusCode === "REJECTED" && c.rejectionReason && (
            <p className="rounded-none border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200/80">
              {c.rejectionReason}
            </p>
          )}

          {isSeries && episodes.length > 0 && (
            <div className="space-y-4 border-t border-white/[0.06] pt-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary/60">
                Modération des épisodes
              </p>
              {episodesBySeason.map(([seasonNumber, seasonEps]) => (
                <div key={seasonNumber} className="space-y-2">
                  <p className="text-[12px] font-medium text-white/55">Saison {seasonNumber}</p>
                  <ul className="space-y-2">
                    {seasonEps.map((ep) => {
                      const epStatus = ep.status?.code ?? "";
                      const epUi = CONTENT_STATUS_UI[epStatus] ?? {
                        label: ep.status?.label ?? epStatus,
                        dot: "bg-white/35",
                        text: "text-white/45",
                      };
                      const canModerateEp = epStatus !== "PUBLISHED";
                      const epBusy = approvingEpisodeId === ep.id;

                      return (
                        <li
                          key={ep.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white/90">
                              E{ep.episodeNumber} · {ep.title}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                              <span className={`inline-flex items-center gap-1 ${epUi.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${epUi.dot}`} />
                                {epUi.label}
                              </span>
                              {ep.videoStatus && <span>Vidéo : {ep.videoStatus}</span>}
                              {ep.rejectionReason && (
                                <span className="text-red-300/80">{ep.rejectionReason}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ep.canPlayVideo && onWatchEpisode && (
                              <button
                                type="button"
                                onClick={() => onWatchEpisode(ep.id)}
                                className="inline-flex items-center gap-1 rounded-none border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary hover:bg-primary/15"
                              >
                                <Play size={12} />
                                Lire
                              </button>
                            )}
                            {canModerateEp && onApproveEpisode && (
                              <button
                                type="button"
                                onClick={() => onApproveEpisode(ep.id)}
                                disabled={epBusy || !ep.canPlayVideo}
                                title={
                                  !ep.canPlayVideo
                                    ? "Vidéo non prête"
                                    : "Publier cet épisode"
                                }
                                className="inline-flex items-center gap-1 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"
                              >
                                {epBusy ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                Publier
                              </button>
                            )}
                            {canModerateEp && onRejectEpisode && (
                              <button
                                type="button"
                                onClick={() => onRejectEpisode(ep.id)}
                                className="inline-flex items-center gap-1 rounded-none border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20"
                              >
                                <XCircle size={12} />
                                Rejeter
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
