"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { creatorsApi } from "@/lib/api/creators";
import { StudioContentCard } from "@/components/studio/StudioContentCard";
import {
  StudioCatalogSummary,
  StudioCatalogToolbar,
} from "@/components/studio/StudioCatalogToolbar";
import {
  StudioPanel,
  StudioPrimaryButton,
  StudioEmpty,
} from "@/components/studio/StudioShell";
import type { CreatorContentListItem } from "@/lib/types/studio-content";
import { getApiErrorMessage } from "@/lib/api/feedback";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { Film } from "lucide-react";

const STATUS_FILTERS = [
  { code: "", label: "Tous" },
  { code: "DRAFT", label: "Brouillons" },
  { code: "PENDING_REVIEW", label: "En attente" },
  { code: "PUBLISHED", label: "Publiés" },
  { code: "REJECTED", label: "Rejetés" },
] as const;

const VALID_STATUS: Set<string> = new Set(STATUS_FILTERS.map((f) => f.code).filter(Boolean));

export default function StudioContentsPage() {
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("status") ?? "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    VALID_STATUS.has(statusFromUrl) ? statusFromUrl : "",
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["creator-contents", { page, status }],
    queryFn: () => creatorsApi.getMyContents({ page, status: status || undefined, limit: 50 }),
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const { data: statsData } = useQuery({
    queryKey: ["creator-contents-stats"],
    queryFn: () => creatorsApi.getMyContents({ page: 1, limit: 200 }),
    staleTime: 60_000,
  });

  const items: CreatorContentListItem[] = (data as { items?: CreatorContentListItem[] })?.items ?? [];
  const total = (data as { total?: number })?.total ?? 0;
  const allForStats: CreatorContentListItem[] =
    (statsData as { items?: CreatorContentListItem[] })?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const haystack = [
        c.title,
        c.slug,
        c.shortDescription,
        c.description,
        c.contentTypeLabel,
        c.visibilityLabel,
        ...c.genres.map((g) => g.label),
        ...c.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of allForStats) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [allForStats]);

  const catalogTotal = (statsData as { total?: number })?.total ?? total;

  const panelTitle =
    search.trim() || status
      ? `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`
      : "Catalogue";

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-4 flex justify-end">
        <StudioPrimaryButton href="/studio/contents/new" icon={Plus}>
          Nouveau contenu
        </StudioPrimaryButton>
      </div>

      <StudioCatalogSummary total={catalogTotal} statusCounts={statusCounts} />

      <StudioCatalogToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={(code) => {
          setStatus(code);
          setPage(1);
        }}
        filters={STATUS_FILTERS}
        statusCounts={statusCounts}
      />

      {isLoading ? (
        <BrandLoader fullScreen={false} size="md" tagline="Vos contenus" className="py-20" />
      ) : isError ? (
        <StudioPanel title="Erreur">
          <div className="py-12 text-center">
            <p className="text-sm font-light text-white/50">
              {getApiErrorMessage(error) ?? "Impossible de charger le catalogue."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
            >
              Réessayer
            </button>
          </div>
        </StudioPanel>
      ) : filtered.length === 0 ? (
        <StudioPanel title={panelTitle}>
          <StudioEmpty
            icon={Film}
            title={
              status || search
                ? "Aucun résultat pour ces critères"
                : "Aucun contenu pour le moment"
            }
            description={
              status || search
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Publiez votre première fiche pour alimenter le catalogue."
            }
            action={
              status ? (
                <button
                  type="button"
                  onClick={() => setStatus("")}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Tout afficher
                </button>
              ) : (
                <StudioPrimaryButton href="/studio/contents/new" icon={Plus}>
                  Créer un contenu
                </StudioPrimaryButton>
              )
            }
          />
        </StudioPanel>
      ) : (
        <StudioPanel title={panelTitle}>
          <div className="-mx-5 -my-1 sm:-mx-6">
            {filtered.map((content) => (
              <StudioContentCard key={content.id} content={content} />
            ))}
          </div>
        </StudioPanel>
      )}

      {total > 50 && !search && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-white/40">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-white/[0.08] px-3 py-1.5 transition-colors hover:border-white/[0.14] hover:text-white/70 disabled:opacity-30"
          >
            Précédent
          </button>
          <span className="tabular-nums text-white/55">Page {page}</span>
          <button
            type="button"
            disabled={items.length < 50}
            onClick={() => setPage((p) => p + 1)}
            className="border border-white/[0.08] px-3 py-1.5 transition-colors hover:border-white/[0.14] hover:text-white/70 disabled:opacity-30"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
