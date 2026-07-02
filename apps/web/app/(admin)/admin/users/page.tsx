"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { formatRelative } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  AdminPageHeader,
  AdminPanel,
  AdminSearchInput,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
  ROLE_UI,
} from "@/components/admin/AdminShell";

const PAGE_LIMIT = 20;

function normalizeUsersList(data: unknown): { items: any[]; total: number; limit: number } {
  if (!data) return { items: [], total: 0, limit: PAGE_LIMIT };
  if (Array.isArray(data)) {
    return { items: data, total: data.length, limit: PAGE_LIMIT };
  }
  const d = data as { items?: any[]; total?: number; limit?: number };
  const items = d.items ?? [];
  return {
    items,
    total: d.total ?? items.length,
    limit: d.limit ?? PAGE_LIMIT,
  };
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-white/[0.06] text-white/50 border-white/[0.08]",
  BASIC: "bg-blue-500/15 text-blue-300/90 border-blue-500/20",
  PREMIUM: "bg-amber-500/15 text-amber-300/90 border-amber-500/20",
};

function userDisplayName(u: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string;
}) {
  const fromParts = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (u.name?.trim()) return u.name.trim();
  return u.email ?? "—";
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", debouncedSearch, page],
    queryFn: () =>
      adminApi.getUsers({
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        page,
        limit: PAGE_LIMIT,
      }),
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUserActive(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const { items: users, total, limit } = normalizeUsersList(data);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Utilisateurs"
        subtitle={`${total} compte${total !== 1 ? "s" : ""} enregistré${total !== 1 ? "s" : ""}`}
      />

      <div className="relative max-w-sm mb-6 [&_input]:pl-9">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10"
        />
        <AdminSearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Rechercher par email, nom…"
        />
      </div>

      {isError ? (
        <AdminEmpty
          icon={Users}
          title="Impossible de charger les utilisateurs"
          description={getApiErrorMessage(error) ?? ""}
        />
      ) : isLoading ? (
        <AdminLoading />
      ) : users.length === 0 ? (
        <AdminEmpty
          icon={Users}
          title={debouncedSearch.trim() ? "Aucun utilisateur pour cette recherche" : "Aucun utilisateur en base"}
          description={
            debouncedSearch.trim()
              ? "Essayez un autre email ou nom."
              : "Lancez le seed API (`npx prisma db seed`) ou créez des comptes depuis l’admin."
          }
        />
      ) : (
        <>
          <AdminPanel title="Comptes">
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-3 mb-1 border-b border-white/[0.05] text-[10px] uppercase tracking-[0.12em] text-white/30 font-medium">
              <span>Utilisateur</span>
              <span>Rôle</span>
              <span>Plan</span>
              <span className="hidden lg:block">Inscription</span>
              <span className="text-right">Statut</span>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {users.map((u: any) => {
                const roleCode = u.role ?? "VIEWER";
                const roleCls =
                  ROLE_UI[roleCode] ?? "bg-white/[0.06] text-white/50 border-white/[0.08]";
                return (
                  <li
                    key={u.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 md:gap-4 py-4 first:pt-0 last:pb-0 items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/90 truncate">
                        {userDisplayName(u)}
                      </p>
                      <p className="text-[11px] text-white/35 font-light truncate">{u.email}</p>
                    </div>
                    <span
                      className={`inline-flex w-fit px-2 py-0.5 rounded-none text-[10px] font-medium border ${roleCls}`}
                    >
                      {roleCode}
                    </span>
                    <span
                      className={`inline-flex w-fit px-2 py-0.5 rounded-none text-[10px] font-medium border ${
                        PLAN_COLORS[u.plan] ?? PLAN_COLORS.FREE
                      }`}
                    >
                      {u.planLabel ?? u.plan ?? "FREE"}
                    </span>
                    <p className="hidden lg:block text-[11px] text-white/35 font-light">
                      {formatRelative(u.createdAt)}
                    </p>
                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span
                        className={`text-[11px] font-medium ${
                          u.isActive ? "text-emerald-400/90" : "text-red-400/90"
                        }`}
                      >
                        {u.isActive ? "Actif" : "Suspendu"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(u.id)}
                        disabled={toggleMutation.isPending}
                        aria-label={u.isActive ? "Suspendre" : "Réactiver"}
                        className={`p-2 rounded-none border border-white/[0.06] transition-colors ${
                          u.isActive
                            ? "text-white/40 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10"
                            : "text-white/40 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/10"
                        }`}
                      >
                        {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
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
