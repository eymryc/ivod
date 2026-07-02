"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Film, Loader2, ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPills,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";
import type { AdminContentListItem } from "@/lib/types/admin-content";
import { AdminContentListRow } from "@/components/admin/AdminContentListRow";
import { AdminContentDetailPanel } from "@/components/admin/AdminContentDetailPanel";
import { adminWatchHref } from "@/lib/utils/admin-watch";

const STATUS_FILTERS = [
  { code: "PENDING_REVIEW", label: "En attente" },
  { code: "PUBLISHED", label: "Publiés" },
  { code: "REJECTED", label: "Rejetés" },
  { code: "DRAFT", label: "Brouillons" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["code"];

const PAGE_SIZE = 12;

export default function AdminContentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") as StatusFilter | null;
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [status, setStatus] = useState<StatusFilter>(
    STATUS_FILTERS.some((s) => s.code === statusParam) ? statusParam! : "PENDING_REVIEW",
  );
  const [page, setPage] = useState(pageParam);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectEpisodeId, setRejectEpisodeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingEpisodeId, setApprovingEpisodeId] = useState<string | null>(null);
  const qc = useQueryClient();

  const adminReturnPath = (() => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (page > 1) params.set("page", String(page));
    return `/admin/contents?${params.toString()}`;
  })();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (page > 1) params.set("page", String(page));
    router.replace(`/admin/contents?${params.toString()}`, { scroll: false });
  }, [status, page, router]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-contents", status, page],
    queryFn: () => adminApi.getContents({ status, page, limit: PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveContent(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-contents"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectContent(id, reason),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-contents"] });
      setRejectId(null);
      setRejectReason("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const approveEpisodeMutation = useMutation({
    mutationFn: (episodeId: string) => adminApi.approveEpisode(episodeId),
    onMutate: (episodeId) => setApprovingEpisodeId(episodeId),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-contents"] });
    },
    onError: (err: ApiError) => showApiError(err),
    onSettled: () => setApprovingEpisodeId(null),
  });

  const rejectEpisodeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectEpisode(id, reason),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-contents"] });
      setRejectEpisodeId(null);
      setRejectReason("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const items = ((data as { items?: AdminContentListItem[] })?.items ?? []) as AdminContentListItem[];
  const total = (data as { total?: number })?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selected =
    items.find((c) => c.id === selectedId) ?? (items.length > 0 ? items[0] : null);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((c) => c.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusChange = (s: StatusFilter) => {
    setStatus(s);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <AdminPageHeader
        title="Contenus"
        subtitle="Liste compacte — sélectionnez un contenu pour afficher la fiche complète et modérer."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPills options={STATUS_FILTERS} value={status} onChange={handleStatusChange} />
        {total > 0 && (
          <p className="text-[12px] text-white/40 tabular-nums">
            {total.toLocaleString("fr-FR")} contenu{total > 1 ? "s" : ""} · page {page} / {totalPages}
            {isFetching && !isLoading && (
              <Loader2 size={12} className="ml-2 inline animate-spin text-primary" />
            )}
          </p>
        )}
      </div>

      {(rejectId || rejectEpisodeId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-none border border-white/[0.06] bg-[#0c0c14] ring-1 ring-primary/[0.06] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white tracking-tight mb-4">
              {rejectEpisodeId ? "Raison du rejet (épisode)" : "Raison du rejet"}
            </h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Expliquez pourquoi ce contenu est rejeté…"
              className="ivod-cinema-textarea w-full resize-none mb-5 min-h-[6rem]"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectEpisodeId(null);
                  setRejectReason("");
                }}
                className="flex-1 py-2.5 rounded-none border border-white/[0.08] text-[13px] text-white/50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rejectEpisodeId) {
                    rejectEpisodeMutation.mutate({ id: rejectEpisodeId, reason: rejectReason });
                  } else if (rejectId) {
                    rejectMutation.mutate({ id: rejectId, reason: rejectReason });
                  }
                }}
                disabled={
                  !rejectReason.trim() ||
                  rejectMutation.isPending ||
                  rejectEpisodeMutation.isPending
                }
                className="flex-1 py-2.5 rounded-none bg-red-500/90 disabled:opacity-40 text-white text-[13px] font-medium flex items-center justify-center gap-2"
              >
                {(rejectMutation.isPending || rejectEpisodeMutation.isPending) && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <AdminLoading />
      ) : items.length === 0 ? (
        <AdminEmpty icon={Film} title="Aucun contenu dans cette catégorie." />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-1.5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                Catalogue · {items.length} sur cette page
              </p>
              {items.map((c) => (
                <AdminContentListRow
                  key={c.id}
                  content={c}
                  selected={selected?.id === c.id}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))}
            </div>

            <div className="min-w-0">
              {selected ? (
                <AdminContentDetailPanel
                  content={selected}
                  showModerationActions={selected.status?.code === "PENDING_REVIEW"}
                  onApprove={() => approveMutation.mutate(selected.id)}
                  onReject={() => setRejectId(selected.id)}
                  onWatch={() => router.push(adminWatchHref(selected, adminReturnPath))}
                  watchReturnPath={adminReturnPath}
                  approving={approveMutation.isPending}
                  onApproveEpisode={(episodeId) => approveEpisodeMutation.mutate(episodeId)}
                  onRejectEpisode={(episodeId) => setRejectEpisodeId(episodeId)}
                  onWatchEpisode={(episodeId) =>
                    router.push(
                      adminWatchHref(
                        { id: selected.id, previewEpisodeId: episodeId },
                        adminReturnPath,
                      ),
                    )
                  }
                  approvingEpisodeId={approvingEpisodeId}
                />
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-none border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <MousePointerClick size={28} className="text-white/20 mb-3" />
                  <p className="text-[13px] text-white/45">Sélectionnez un contenu dans la liste</p>
                </div>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Pagination"
            >
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-none border border-white/10 px-3 py-2 text-[12px] text-white/70 disabled:opacity-30 hover:border-primary/30"
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <div className="flex flex-wrap items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) {
                    p = i + 1;
                  } else if (page <= 4) {
                    p = i + 1;
                  } else if (page >= totalPages - 3) {
                    p = totalPages - 6 + i;
                  } else {
                    p = page - 3 + i;
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      className={`min-w-[2.25rem] rounded-none px-2 py-2 text-[12px] font-medium tabular-nums transition-colors ${
                        p === page
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "border border-white/10 text-white/50 hover:border-primary/25"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-none border border-white/10 px-3 py-2 text-[12px] text-white/70 disabled:opacity-30 hover:border-primary/30"
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
