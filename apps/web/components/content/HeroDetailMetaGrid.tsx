"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Tv,
  User,
  BadgeCheck,
  Clock,
  Shield,
  MapPin,
  Languages,
  Sparkles,
} from "lucide-react";
import type { Entitlement } from "@/core/rules/entitlement";
import { viewerOfferLabel } from "@/lib/constants/monetization";
import { formatDuration, resolveDurationSeconds } from "@/lib/utils/format";

const HERO_META_TILE_LIMIT = 8;

type MetaTile = {
  key: string;
  label: string;
  value: ReactNode;
  accent?: boolean;
};

type Props = {
  content: any;
  entitlement?: Entitlement | null;
  className?: string;
};

function MetaTileCard({ label, value, accent }: MetaTile) {
  return (
    <div className={`hero-meta-tile ${accent ? "hero-meta-tile--accent" : ""}`}>
      <span className="hero-meta-tile__label">{label}</span>
      <div className="hero-meta-tile__value">{value}</div>
    </div>
  );
}

/** Tuiles hero : infos catalogue utiles à la décision (max 8, pas de progression). */
function buildHeroMetaTiles(
  content: any,
  entitlement?: Entitlement | null,
): MetaTile[] {
  const tiles: MetaTile[] = [];

  const typeCode =
    content.contentType?.code ?? content.contentTypeCode ?? content.contentType ?? null;
  const typeLabel = content.contentType?.label ?? typeCode;
  const isSeries = typeCode === "SERIE" || typeCode === "WEB_SERIE";
  const genres =
    content.genres ??
    content.contentGenres?.map((cg: any) => cg.genre) ??
    [];

  const push = (tile: MetaTile | null) => {
    if (tile && tiles.length < HERO_META_TILE_LIMIT) tiles.push(tile);
  };

  if (typeLabel) {
    push({
      key: "type",
      label: "Type",
      accent: true,
      value: (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Tv size={12} className="shrink-0 text-brand-gold/80" />
          {typeLabel}
        </span>
      ),
    });
  }

  if (isSeries && (content.seasonCount > 0 || content.episodeCount > 0)) {
    const parts: string[] = [];
    if (content.seasonCount > 0) {
      parts.push(
        `${content.seasonCount} saison${content.seasonCount > 1 ? "s" : ""}`,
      );
    }
    if (content.episodeCount > 0) {
      parts.push(
        `${content.episodeCount} épisode${content.episodeCount > 1 ? "s" : ""}`,
      );
    }
    push({
      key: "seasons",
      label: "Saisons / épisodes",
      value: parts.join(" · "),
    });
  } else if (content.releaseYear) {
    push({
      key: "year",
      label: "Année",
      value: String(content.releaseYear),
    });
  }

  const offer =
    content.visibility &&
    (viewerOfferLabel(content.visibility, content.ppvPrice) ??
      content.visibilityLabel ??
      content.visibility);
  if (offer) {
    push({ key: "offer", label: "Offre", value: offer });
  }

  if (entitlement) {
    push({
      key: "access",
      label: "Accès",
      value: entitlement.hasAccess ? (
        <span className="text-emerald-400/95 font-medium">Disponible pour vous</span>
      ) : entitlement.reason === "SVOD" ? (
        "Abonnement requis"
      ) : entitlement.reason === "TVOD" ? (
        "Achat requis"
      ) : (
        "Accès limité"
      ),
    });
  }

  if (genres.length > 0) {
    push({
      key: "genres",
      label: "Genres",
      value: (
        <span className="flex min-w-0 flex-wrap gap-1">
          {genres.slice(0, 2).map((g: any) => (
            <Link
              key={g.code}
              href={`/films?genre=${g.code}`}
              className="hero-meta-genre-pill max-w-full truncate"
            >
              {g.label}
            </Link>
          ))}
          {genres.length > 2 && (
            <span className="text-[10px] text-white/45 self-center">+{genres.length - 2}</span>
          )}
        </span>
      ),
    });
  }

  if (content.creator?.stageName) {
    push({
      key: "creator",
      label: "Créateur",
      value: (
        <Link
          href={`/creator/${content.creator.id}`}
          className="inline-flex min-w-0 items-center gap-1 font-medium text-brand-magenta transition-colors hover:text-brand-orange"
        >
          <User size={12} className="shrink-0" />
          <span className="truncate">{content.creator.stageName}</span>
          {content.creator.verified && (
            <BadgeCheck size={12} className="shrink-0 text-sky-400" aria-label="Vérifié" />
          )}
        </Link>
      ),
    });
  }

  const durationSec = resolveDurationSeconds(
    content.duration,
    content.videoAsset?.durationSec,
  );
  if (!isSeries && durationSec) {
    push({
      key: "duration",
      label: "Durée",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={12} className="shrink-0 text-white/45" />
          {formatDuration(durationSec)}
        </span>
      ),
    });
  }

  if (content.maturityRating?.label) {
    push({
      key: "rating",
      label: "Classification",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Shield size={12} className="shrink-0 text-white/45" />
          {content.maturityRating.label}
        </span>
      ),
    });
  }

  if (content.countryOfOrigin?.label) {
    push({
      key: "country",
      label: "Pays",
      value: (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin size={12} className="shrink-0 text-white/45" />
          <span className="truncate">{content.countryOfOrigin.label}</span>
        </span>
      ),
    });
  }

  if (content.originalLanguage?.label) {
    push({
      key: "language",
      label: "Langue",
      value: (
        <span className="inline-flex items-center gap-1.5 truncate">
          <Languages size={12} className="shrink-0 text-white/45" />
          <span className="truncate">{content.originalLanguage.label}</span>
        </span>
      ),
    });
  }

  if (isSeries && content.releaseYear) {
    push({
      key: "year",
      label: "Année",
      value: String(content.releaseYear),
    });
  }

  if (content.isExclusive) {
    push({
      key: "exclusive",
      label: "Exclusivité",
      value: (
        <span className="inline-flex items-center gap-1.5 font-medium text-brand-magenta">
          <Sparkles size={12} className="shrink-0" />
          Exclusif iVOD
        </span>
      ),
    });
  }

  return tiles;
}

function MetaRow({ tiles }: { tiles: MetaTile[] }) {
  if (!tiles.length) return null;

  return (
    <div className="hero-meta-row hero-meta-row--4">
      {tiles.map(({ key, ...tile }) => (
        <MetaTileCard key={key} {...tile} />
      ))}
    </div>
  );
}

export function HeroDetailMetaGrid({
  content,
  entitlement,
  className = "",
}: Props) {
  const tiles = buildHeroMetaTiles(content, entitlement);
  const row1 = tiles.slice(0, 4);
  const row2 = tiles.slice(4, 8);

  if (!row1.length && !row2.length) return null;

  return (
    <div
      className={`hero-meta-grid ${className}`}
      role="list"
      aria-label="Informations sur le titre"
    >
      <MetaRow tiles={row1} />
      <MetaRow tiles={row2} />
    </div>
  );
}
