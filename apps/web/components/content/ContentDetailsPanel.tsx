"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Globe,
  Languages,
  MapPin,
  Shield,
  Tag,
  Tv,
  User,
  Film,
  Subtitles,
  Volume2,
  BadgeCheck,
} from "lucide-react";
import { formatCount, formatDate, formatDuration } from "@/lib/utils/format";
import type { Entitlement } from "@/core/rules/entitlement";
import { viewerOfferLabel } from "@/lib/constants/monetization";

function DetailRow({
  label,
  children,
  compact,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  if (children == null || children === "" || children === false) return null;
  return (
    <div className="min-w-0">
      <dt
        className={
          compact
            ? "text-[10px] font-medium uppercase tracking-[0.1em] text-white/40 mb-0.5"
            : "text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 mb-1"
        }
      >
        {label}
      </dt>
      <dd className={compact ? "text-[13px] text-white/88 leading-snug" : "text-sm text-white/88 leading-snug"}>
        {children}
      </dd>
    </div>
  );
}

function formatResolution(height?: number | null): string | null {
  if (!height) return null;
  if (height >= 2160) return "4K UHD";
  if (height >= 1080) return "Full HD (1080p)";
  if (height >= 720) return "HD (720p)";
  return `${height}p`;
}

export type ContentDetailsFieldsProps = {
  content: any;
  entitlement?: Entitlement | null;
  userProgress?: {
    watchedSeconds?: number;
    percentage?: number;
    completed?: boolean;
    lastWatchedAt?: string;
  } | null;
  variant?: "panel" | "hero";
};

export function ContentDetailsFields({
  content,
  entitlement,
  userProgress,
  variant = "panel",
}: ContentDetailsFieldsProps) {
  const compact = variant === "hero";
  const typeCode =
    content.contentType?.code ?? content.contentTypeCode ?? content.contentType ?? null;
  const typeLabel = content.contentType?.label ?? typeCode;
  const genres =
    content.genres ??
    content.contentGenres?.map((cg: any) => cg.genre) ??
    [];
  const stats = content.contentStats;
  const tags: string[] = Array.isArray(content.tags) ? content.tags : [];
  const subtitles = content.subtitleTracks ?? [];
  const audioTracks = content.audioTracks ?? [];
  const geo = content.geoRestrictions ?? [];
  const isSeries = typeCode === "SERIE" || typeCode === "WEB_SERIE";

  const resolution = formatResolution(content.videoAsset?.height);
  const uniqueLangs = [
    ...new Map(
      [...subtitles, ...audioTracks]
        .map((t: any) => t.language)
        .filter(Boolean)
        .map((l: any) => [l.code, l.label]),
    ).values(),
  ];

  const allowCountries = geo.filter((g: any) => g.mode === "ALLOW");
  const blockCountries = geo.filter((g: any) => g.mode === "BLOCK");

  const sectionGap = compact ? "mt-4 pt-4" : "mt-6 pt-5";
  const sectionBorder = "border-t border-white/[0.06]";

  return (
    <>
      <dl
        className={
          compact
            ? "grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5"
        }
      >
        {typeLabel && (
          <DetailRow label="Type" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <Tv size={14} className="text-white/50" />
              {typeLabel}
            </span>
          </DetailRow>
        )}

        {genres.length > 0 && (
          <DetailRow label="Genres" compact={compact}>
            <span className="flex flex-wrap gap-1.5">
              {genres.map((g: any) => (
                <Link
                  key={g.code}
                  href={`/films?genre=${g.code}`}
                  className="ivod-btn px-2 py-0.5 text-[12px] border border-white/12 bg-white/[0.04] hover:border-brand-magenta/40 hover:text-white transition-colors"
                >
                  {g.label}
                </Link>
              ))}
            </span>
          </DetailRow>
        )}

        {content.releaseYear && (
          <DetailRow label="Année" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} className="text-white/50" />
              {content.releaseYear}
            </span>
          </DetailRow>
        )}

        {content.duration > 0 && !isSeries && (
          <DetailRow label="Durée" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-white/50" />
              {formatDuration(content.duration)}
            </span>
          </DetailRow>
        )}

        {isSeries && (content.seasonCount > 0 || content.episodeCount > 0) && (
          <DetailRow label="Saisons / épisodes" compact={compact}>
            {content.seasonCount > 0
              ? `${content.seasonCount} saison${content.seasonCount > 1 ? "s" : ""}`
              : ""}
            {content.seasonCount > 0 && content.episodeCount > 0 ? " · " : ""}
            {content.episodeCount > 0
              ? `${content.episodeCount} épisode${content.episodeCount > 1 ? "s" : ""}`
              : ""}
          </DetailRow>
        )}

        {content.maturityRating?.label && (
          <DetailRow label="Classification" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <Shield size={14} className="text-white/50" />
              {content.maturityRating.label}
            </span>
          </DetailRow>
        )}

        {content.originalLanguage?.label && (
          <DetailRow label="Langue originale" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <Languages size={14} className="text-white/50" />
              {content.originalLanguage.label}
            </span>
          </DetailRow>
        )}

        {content.countryOfOrigin?.label && (
          <DetailRow label="Pays d'origine" compact={compact}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-white/50" />
              {content.countryOfOrigin.label}
            </span>
          </DetailRow>
        )}

        {content.visibility && (
          <DetailRow label="Offre" compact={compact}>
            {viewerOfferLabel(content.visibility, content.ppvPrice) ??
              content.visibilityLabel ??
              content.visibility}
          </DetailRow>
        )}

        {content.isExclusive && (
          <DetailRow label="Exclusivité" compact={compact}>
            <span className="text-brand-magenta font-medium">Exclusif iVOD</span>
          </DetailRow>
        )}

        {content.creator?.stageName && (
          <DetailRow label="Créateur" compact={compact}>
            <Link
              href={`/creator/${content.creator.id}`}
              className="inline-flex items-center gap-1.5 text-brand-magenta hover:text-brand-orange transition-colors"
            >
              <User size={14} />
              {content.creator.stageName}
              {content.creator.verified && (
                <BadgeCheck size={14} className="text-sky-400" aria-label="Vérifié" />
              )}
            </Link>
          </DetailRow>
        )}

        {content.primaryRightsholder?.displayName && (
          <DetailRow label="Ayant droit" compact={compact}>
            {content.primaryRightsholder.displayName}
          </DetailRow>
        )}

        {content.distributor?.displayName && (
          <DetailRow label="Distributeur" compact={compact}>
            {content.distributor.displayName}
          </DetailRow>
        )}

        {content.publishedAt && (
          <DetailRow label="Publication" compact={compact}>
            {formatDate(content.publishedAt, "d MMMM yyyy")}
          </DetailRow>
        )}

        {content.releaseDate && (
          <DetailRow label="Date de sortie" compact={compact}>
            {formatDate(content.releaseDate, "d MMMM yyyy")}
          </DetailRow>
        )}

        {resolution && (
          <DetailRow label="Qualité vidéo" compact={compact}>
            {resolution}
          </DetailRow>
        )}

        {subtitles.length > 0 && (
          <DetailRow label="Sous-titres" compact={compact}>
            <span className="inline-flex items-center gap-1.5 flex-wrap">
              <Subtitles size={14} className="text-white/50 shrink-0" />
              {[...new Map(subtitles.map((s: any) => [s.language?.code, s.language?.label])).entries()]
                .filter(([code]) => code)
                .map(([, label]) => label)
                .join(", ")}
            </span>
          </DetailRow>
        )}

        {audioTracks.length > 0 && (
          <DetailRow label="Audio" compact={compact}>
            <span className="inline-flex items-center gap-1.5 flex-wrap">
              <Volume2 size={14} className="text-white/50 shrink-0" />
              {audioTracks
                .map((a: any) => a.language?.label)
                .filter(Boolean)
                .join(", ")}
            </span>
          </DetailRow>
        )}

        {uniqueLangs.length > 0 && subtitles.length === 0 && audioTracks.length === 0 && (
          <DetailRow label="Langues disponibles" compact={compact}>
            {uniqueLangs.map((l) => l).join(", ")}
          </DetailRow>
        )}

        {entitlement && (
          <DetailRow label="Accès" compact={compact}>
            {entitlement.hasAccess ? (
              <span className="text-emerald-400/90">Disponible pour vous</span>
            ) : entitlement.reason === "SVOD" ? (
              <span>Abonnement requis</span>
            ) : entitlement.reason === "TVOD" ? (
              <span>Achat requis</span>
            ) : entitlement.reason === "GEO_BLOCKED" ? (
              <span>Non disponible dans votre région</span>
            ) : (
              <span>Accès limité</span>
            )}
          </DetailRow>
        )}

        {userProgress && (userProgress.percentage ?? 0) > 0 && (
          <DetailRow label="Votre progression" compact={compact}>
            {Math.round(userProgress.percentage ?? 0)}%
            {userProgress.completed ? " · Terminé" : ""}
            {userProgress.watchedSeconds
              ? ` · ${formatDuration(userProgress.watchedSeconds)} regardé`
              : ""}
          </DetailRow>
        )}
      </dl>

      {tags.length > 0 && (
        <div className={`${sectionGap} ${sectionBorder}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 mb-2 flex items-center gap-1.5">
            <Tag size={12} />
            Mots-clés
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="ivod-btn px-2.5 py-1 text-[12px] text-white/70 border border-white/10 bg-white/[0.03]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {(stats || content.viewCount != null) && (
        <div className={`${sectionGap} ${sectionBorder}`}>
          <p
            className={
              compact
                ? "text-[10px] font-medium uppercase tracking-[0.1em] text-white/40 mb-2"
                : "text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 mb-3"
            }
          >
            Statistiques
          </p>
          <div
            className={
              compact
                ? "flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/75"
                : "flex flex-wrap gap-6 text-sm text-white/75"
            }
          >
            {(stats?.totalViews ?? content.viewCount) != null && (
              <span>{formatCount(Number(stats?.totalViews ?? content.viewCount))} vues</span>
            )}
            {(stats?.averageRating ?? content.averageRating) > 0 && (
              <span>
                Note {Number(stats?.averageRating ?? content.averageRating).toFixed(1)} / 5
              </span>
            )}
            {(stats?.likeCount ?? content.likeCount) != null && (
              <span>{formatCount(Number(stats?.likeCount ?? content.likeCount))} j&apos;aime</span>
            )}
            {stats?.favoriteCount != null && (
              <span>{formatCount(stats.favoriteCount)} favoris</span>
            )}
            {stats?.commentCount != null && stats.commentCount > 0 && (
              <span>{formatCount(stats.commentCount)} commentaires</span>
            )}
            {stats?.reviewCount != null && stats.reviewCount > 0 && (
              <span>{formatCount(stats.reviewCount)} avis</span>
            )}
            {stats?.completionRate != null && stats.completionRate > 0 && (
              <span>{Math.round(stats.completionRate * 100)}% terminé en moyenne</span>
            )}
          </div>
        </div>
      )}

      {(allowCountries.length > 0 || blockCountries.length > 0) && (
        <div className={`${sectionGap} ${sectionBorder}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 mb-2 flex items-center gap-1.5">
            <Globe size={12} />
            Disponibilité géographique
          </p>
          {allowCountries.length > 0 && (
            <p className="text-sm text-white/70 mb-1">
              <span className="text-white/45">Disponible : </span>
              {allowCountries.map((g: any) => g.country?.label).filter(Boolean).join(", ")}
            </p>
          )}
          {blockCountries.length > 0 && (
            <p className="text-sm text-white/70">
              <span className="text-white/45">Restreint : </span>
              {blockCountries.map((g: any) => g.country?.label).filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      )}
    </>
  );
}

type PanelProps = ContentDetailsFieldsProps;

export function ContentDetailsPanel({ content, entitlement, userProgress }: PanelProps) {
  return (
    <section className="border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Film size={18} className="text-brand-magenta shrink-0" />
        <h2 className="text-lg font-semibold text-white tracking-tight">Informations</h2>
      </div>
      <ContentDetailsFields
        content={content}
        entitlement={entitlement}
        userProgress={userProgress}
        variant="panel"
      />
    </section>
  );
}
