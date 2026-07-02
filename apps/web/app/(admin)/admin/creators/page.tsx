"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, ShieldCheck, Send, UserCheck, Film, Eye, Search, Loader2,
} from "lucide-react";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { formatCount, formatRelative, formatXOF } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminPanel,
  AdminSearchInput,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
} from "@/components/admin/AdminShell";

const PAGE_LIMIT = 20;

export default function AdminCreatorsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-creators", debouncedSearch, page],
    queryFn: () =>
      adminApi.getCreators(page, PAGE_LIMIT, debouncedSearch.trim() || undefined),
    staleTime: 60_000,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyCreator(id),
    onSuccess: (res: any) => {
      showApiSuccess(res);
      qc.invalidateQueries({ queryKey: ["admin-creators"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id: string) => adminApi.resendInvite(id),
    onSuccess: (data) => showApiSuccess(data),
    onError: (err: ApiError) => showApiError(err),
  });

  const creators: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const limit = (data as any)?.limit ?? PAGE_LIMIT;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Créateurs"
        subtitle={`${total} créateur${total !== 1 ? "s" : ""} enregistré${total !== 1 ? "s" : ""}`}
        action={
          <AdminPrimaryButton href="/admin/creators/new" icon={Plus}>
            Nouveau créateur
          </AdminPrimaryButton>
        }
      />

      <div className="relative max-w-sm mb-6 [&_input]:pl-9">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10"
        />
        <AdminSearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Rechercher par nom, email…"
        />
      </div>

      {isError ? (
        <AdminEmpty
          icon={UserCheck}
          title="Impossible de charger les créateurs"
          description={getApiErrorMessage(error) ?? ""}
        />
      ) : isLoading ? (
        <AdminLoading />
      ) : creators.length === 0 ? (
        <AdminEmpty
          icon={UserCheck}
          title={debouncedSearch.trim() ? "Aucun créateur pour cette recherche" : "Aucun créateur enregistré"}
          description={debouncedSearch.trim() ? "Essayez un autre nom ou email." : "Créez le premier créateur via le bouton ci-dessus."}
        />
      ) : (
        <>
          <AdminPanel title="Liste">
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 pb-3 mb-1 border-b border-white/[0.05] text-[10px] uppercase tracking-[0.12em] text-white/30 font-medium">
              <span>Créateur</span>
              <span className="hidden lg:block">Contenus</span>
              <span className="hidden lg:block">Revenus</span>
              <span className="hidden lg:block">Inscrit</span>
              <span>Statut</span>
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {creators.map((c: any) => {
                const contentCount = c.contentCount ?? c._count?.contents ?? 0;
                const fullName = [c.user?.firstName, c.user?.lastName].filter(Boolean).join(" ");
                const displayName = c.stageName ?? (fullName || "—");
                const initial = displayName[0]?.toUpperCase() ?? "?";

                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 md:gap-4 py-4 first:pt-0 last:pb-0 items-center"
                  >
                    {/* Identité */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-primary/25 bg-primary/10 flex items-center justify-center text-primary text-[12px] font-semibold shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white/90 truncate flex items-center gap-1.5">
                          {displayName}
                          {c.verified && <ShieldCheck size={12} className="text-primary shrink-0" />}
                        </p>
                        <p className="text-[11px] text-white/35 font-light truncate">
                          {c.user?.email ?? "—"}
                        </p>
                      </div>
                    </div>

                    {/* Contenus */}
                    <span className="hidden lg:inline-flex items-center gap-1 text-[12px] text-white/50">
                      <Film size={11} className="opacity-60" />
                      {contentCount}
                    </span>

                    {/* Revenus */}
                    <span className="hidden lg:block text-[12px] text-white/50">
                      {formatXOF(c.totalEarned ?? 0)}
                    </span>

                    {/* Date */}
                    <p className="hidden lg:block text-[11px] text-white/35 font-light">
                      {formatRelative(c.createdAt)}
                    </p>

                    {/* Statut */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.invitePending ? (
                        <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-medium border border-secondary/30 bg-secondary/10 text-secondary">
                          Invitation
                        </span>
                      ) : c.user?.isActive === false ? (
                        <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] border border-red-500/30 text-red-400">
                          Inactif
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] border border-emerald-500/30 text-emerald-400">
                          Actif
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/creators/${c.id}`}
                        className="p-1.5 rounded-none border border-white/[0.06] text-white/40 hover:text-primary hover:border-primary/25 transition-colors"
                        title="Détails"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => verifyMutation.mutate(c.id)}
                        disabled={verifyMutation.isPending}
                        title={c.verified ? "Retirer la vérification" : "Vérifier"}
                        className={`p-1.5 rounded-none border transition-colors ${
                          c.verified
                            ? "border-primary/20 text-primary/70 hover:border-red-500/20 hover:text-red-400"
                            : "border-white/[0.06] text-white/40 hover:text-primary hover:border-primary/25"
                        }`}
                      >
                        {verifyMutation.isPending
                          ? <Loader2 size={14} className="animate-spin" />
                          : <ShieldCheck size={14} />}
                      </button>
                      {c.invitePending && (
                        <button
                          type="button"
                          onClick={() => resendInviteMutation.mutate(c.id)}
                          disabled={resendInviteMutation.isPending}
                          title="Renvoyer l'invitation"
                          className="p-1.5 rounded-none border border-white/[0.06] text-white/40 hover:text-secondary hover:border-secondary/25 transition-colors"
                        >
                          {resendInviteMutation.isPending
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Send size={14} />}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </AdminPanel>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
