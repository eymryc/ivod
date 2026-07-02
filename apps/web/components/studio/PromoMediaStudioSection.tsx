"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clapperboard,
  Film,
  Loader2,
  Play,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import type { PromoVideo, PromoVideosBundle, PromoVideoTypeCode } from "@/core/entities/promo.entity";
import { PROMO_VIDEO_TYPE_CODES } from "@/core/entities/promo.entity";
import { UploadZone } from "@/components/studio/UploadZone";
import { PromoPlayerModal } from "@/components/content/PromoPlayerModal";
import { mediaAssetsApi } from "@/lib/api/media-assets";
import { uploadPromoVideo } from "@/lib/api/upload-promo-video";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { formatDuration } from "@/lib/utils/format";
import { BrandLoader } from "@/components/ui/BrandLoader";

const TYPE_LABELS: Record<PromoVideoTypeCode, string> = {
  TEASER: "Teaser",
  TRAILER: "Bande-annonce",
  CLIP: "Extrait",
  MAKING_OF: "Making-of",
};

const TYPE_HINTS: Record<PromoVideoTypeCode, string> = {
  TEASER: "Court format, idéal avant la sortie",
  TRAILER: "Affichée sur le catalogue et la fiche",
  CLIP: "Scène marquante ou extrait",
  MAKING_OF: "Coulisses, interviews, bonus",
};

const TYPE_ICONS: Record<
  PromoVideoTypeCode,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  TEASER: Sparkles,
  TRAILER: Clapperboard,
  CLIP: Film,
  MAKING_OF: Video,
};

type UploadPhase = "idle" | "uploading" | "registering";

function groupByType(bundle: PromoVideosBundle | undefined) {
  const map: Partial<Record<PromoVideoTypeCode, PromoVideo[]>> = {
    TEASER: [...(bundle?.teasers ?? [])],
    TRAILER: [...(bundle?.trailers ?? [])],
    CLIP: [...(bundle?.clips ?? [])],
    MAKING_OF: [...(bundle?.extras.filter((e) => e.typeCode === "MAKING_OF") ?? [])],
  };
  return PROMO_VIDEO_TYPE_CODES.map((type) => ({
    type,
    items: map[type] ?? [],
  }));
}

interface Props {
  contentId: string;
  contentTitle: string;
}

function PromoAssetRow({
  item,
  onPreview,
  onDelete,
  onSetPrimary,
  primaryPending,
  deletePending,
}: {
  item: PromoVideo;
  onPreview: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  primaryPending: boolean;
  deletePending: boolean;
}) {
  const durationLabel =
    item.durationSec && item.durationSec > 0
      ? formatDuration(item.durationSec)
      : "Durée en cours";

  return (
    <li className="group promo-studio-asset-row flex flex-col overflow-hidden">
      <div className="flex min-w-0 items-start gap-3 p-3">
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Aperçu — ${item.displayLabel}`}
          className="promo-studio-asset-thumb shrink-0 flex h-12 w-12 items-center justify-center border border-white/10 bg-black/40 transition-colors hover:border-primary/35 hover:bg-primary/10"
        >
          <Play size={17} className="text-primary/85" />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug text-white line-clamp-2">
            {item.displayLabel}
          </p>
          <p className="text-[10px] text-white/40 tabular-nums">{durationLabel}</p>
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300/95">
              <CheckCircle2 size={9} />
              Prête
            </span>
            {item.isPrimary ? (
              <span className="border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-secondary">
                Principale
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="promo-studio-asset-toolbar grid grid-cols-3 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={onPreview}
          className="promo-studio-toolbar-btn promo-studio-toolbar-btn--primary inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold"
        >
          <Play size={12} />
          Aperçu
        </button>
        {!item.isPrimary ? (
          <button
            type="button"
            disabled={primaryPending}
            onClick={onSetPrimary}
            className="promo-studio-toolbar-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-white/55 hover:text-white disabled:opacity-40"
          >
            <Star size={12} />
            Principale
          </button>
        ) : (
          <span
            aria-hidden
            className="promo-studio-toolbar-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-secondary/50"
          >
            <Star size={12} className="fill-secondary/30" />
            Principale
          </span>
        )}
        <button
          type="button"
          disabled={deletePending}
          onClick={onDelete}
          className="promo-studio-toolbar-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-red-400/70 hover:text-red-300 disabled:opacity-40"
        >
          <Trash2 size={12} />
          Supprimer
        </button>
      </div>
    </li>
  );
}

export function PromoMediaStudioSection({ contentId, contentTitle }: Props) {
  const qc = useQueryClient();
  const [assetType, setAssetType] = useState<PromoVideoTypeCode>("TRAILER");
  const [isPrimary, setIsPrimary] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewPromo, setPreviewPromo] = useState<PromoVideo | null>(null);

  const { data: bundle, isLoading } = useQuery({
    queryKey: ["promo-studio", contentId],
    queryFn: () => mediaAssetsApi.listPromo(contentId),
    staleTime: 30_000,
  });

  const promoBundle = bundle as PromoVideosBundle | undefined;
  const groups = useMemo(() => groupByType(promoBundle), [promoBundle]);
  const totalPromos = promoBundle?.all.length ?? 0;
  const filledTypes = groups.filter((g) => g.items.length > 0).length;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["promo-studio", contentId] });
    await qc.invalidateQueries({ queryKey: ["content", contentId] });
  };

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => mediaAssetsApi.remove(assetId),
    onSuccess: () => {
      showApiSuccess("Vidéo promo supprimée");
      void invalidate();
    },
    onError: showApiError,
  });

  const primaryMutation = useMutation({
    mutationFn: (assetId: string) => mediaAssetsApi.setPrimary(assetId),
    onSuccess: () => {
      showApiSuccess("Vidéo définie comme principale");
      void invalidate();
    },
    onError: showApiError,
  });

  const handleUpload = async (file: File) => {
    setUploadPhase("uploading");
    setUploadProgress(0);
    try {
      const created = await uploadPromoVideo(contentId, {
        file,
        type: assetType,
        isPrimary,
        onUploadProgress: setUploadProgress,
      });
      setUploadPhase("registering");
      await invalidate();
      await qc.refetchQueries({ queryKey: ["promo-studio", contentId] });

      const durationHint =
        created.durationSec && created.durationSec > 0
          ? ` · ${formatDuration(created.durationSec)}`
          : "";
      showApiSuccess(
        `${TYPE_LABELS[assetType]} prête à la lecture${durationHint}.`,
      );
    } catch (e) {
      showApiError(e);
    } finally {
      setUploadPhase("idle");
      setUploadProgress(0);
    }
  };

  const uploading = uploadPhase !== "idle";

  return (
    <section className="promo-studio-panel mb-8 overflow-hidden">
      <header className="promo-studio-panel-header flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/25 bg-primary/10">
            <Clapperboard size={18} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
              Médias promo
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
              Vidéos promotionnelles
            </h2>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="promo-studio-stat">
            <span className="promo-studio-stat-value">{totalPromos}</span>
            <span className="promo-studio-stat-label">vidéo{totalPromos > 1 ? "s" : ""}</span>
          </span>
          <span className="promo-studio-stat">
            <span className="promo-studio-stat-value">{filledTypes}</span>
            <span className="promo-studio-stat-label">type{filledTypes > 1 ? "s" : ""}</span>
          </span>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-8 sm:py-7">
        <div className="promo-studio-intro mb-8 max-w-3xl">
          <p className="text-[13px] leading-relaxed text-white/72">
            Teasers, bandes-annonces, extraits et making-of — disponibles dès l&apos;envoi, sans
            encodage HLS. La bande-annonce principale alimente le hero du catalogue.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10 xl:items-start">
          {/* Bibliothèque */}
          <div className="space-y-5 min-w-0">
            <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-[13px] font-semibold text-white/90">Bibliothèque</h3>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Organisée par type — aperçu avant publication
                </p>
              </div>
            </div>

            {isLoading ? (
              <BrandLoader fullScreen={false} size="sm" showTagline={false} className="py-16" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map(({ type, items }) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <article key={type} className="promo-studio-type-card flex flex-col min-h-[140px]">
                      <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-white/[0.05]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03]">
                          <Icon size={16} className="text-primary/75" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/85">
                              {TYPE_LABELS[type]}
                            </h4>
                            <span className="text-[10px] tabular-nums text-white/35">
                              {items.length}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/38 leading-snug mt-1 line-clamp-2">
                            {TYPE_HINTS[type]}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 p-3">
                        {items.length === 0 ? (
                          <div className="promo-studio-empty flex h-full min-h-[72px] flex-col items-center justify-center gap-1 px-3 py-4 text-center">
                            <p className="text-[11px] text-white/30">Aucune vidéo</p>
                            <button
                              type="button"
                              onClick={() => setAssetType(type)}
                              className="text-[10px] font-medium text-primary/80 hover:text-primary transition-colors"
                            >
                              Ajouter ce type →
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {items.map((item) => (
                              <PromoAssetRow
                                key={item.id}
                                item={item}
                                onPreview={() => setPreviewPromo(item)}
                                onDelete={() => {
                                  if (confirm(`Supprimer « ${item.displayLabel} » ?`)) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                onSetPrimary={() => primaryMutation.mutate(item.id)}
                                primaryPending={primaryMutation.isPending}
                                deletePending={deleteMutation.isPending}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upload — colonne latérale */}
          <aside className="promo-studio-upload-panel xl:sticky xl:top-24 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Upload size={15} className="text-primary/70" />
              <div>
                <h3 className="text-[13px] font-semibold text-white/90">Nouvel envoi</h3>
                <p className="text-[11px] text-white/40">MP4, MKV, MOV · max 2 Go</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                Type de vidéo
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PROMO_VIDEO_TYPE_CODES.map((code) => {
                  const Icon = TYPE_ICONS[code];
                  const active = assetType === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={uploading}
                      onClick={() => setAssetType(code)}
                      className={`promo-studio-type-pill flex flex-col items-start gap-1.5 p-3 text-left transition-all ${
                        active ? "promo-studio-type-pill--active" : ""
                      }`}
                    >
                      <Icon size={14} className={active ? "text-primary" : "text-white/45"} />
                      <span className="text-[11px] font-semibold text-white/90">
                        {TYPE_LABELS[code]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="promo-studio-checkbox flex cursor-pointer items-start gap-3 rounded-none border border-white/[0.06] bg-white/[0.02] p-3.5">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="mt-0.5 accent-primary"
                disabled={uploading}
              />
              <span className="space-y-0.5">
                <span className="block text-[12px] font-medium text-white/85">
                  Vidéo principale de ce type
                </span>
                <span className="block text-[10px] text-white/38 leading-snug">
                  Prioritaire sur la fiche et le catalogue
                </span>
              </span>
            </label>

            <UploadZone onFile={handleUpload} disabled={uploading} maxSizeMb={2_000} />

            {uploadPhase === "uploading" ? (
              <div className="space-y-2">
                <p className="text-[11px] text-primary/80 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Envoi… {uploadProgress}%
                </p>
                <div className="h-1 overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : uploadPhase === "registering" ? (
              <p className="text-[11px] text-primary/80 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                Analyse de la durée…
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      {previewPromo ? (
        <PromoPlayerModal
          promo={previewPromo}
          contentTitle={contentTitle}
          onClose={() => setPreviewPromo(null)}
        />
      ) : null}
    </section>
  );
}
