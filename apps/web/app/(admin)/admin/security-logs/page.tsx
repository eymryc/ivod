"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, CheckCircle2, XCircle, Search } from "lucide-react";
import { privateFetch } from "@/lib/api/client";
import { formatRelative } from "@/lib/utils/format";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPills,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
} from "@/components/admin/AdminShell";

const ACTION_FILTERS = [
  { code: "", label: "Toutes" },
  { code: "LOGIN", label: "Connexion" },
  { code: "FAILED_LOGIN", label: "Échec" },
  { code: "PASSWORD_CHANGE", label: "Mot de passe" },
  { code: "LOGOUT", label: "Déconnexion" },
  { code: "TOKEN_REFRESH", label: "Token" },
] as const;

export default function SecurityLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ["security-logs", debouncedSearch, action, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (action) params.set("action", action);
      return privateFetch<{ items: SecurityLog[]; total: number }>(
        `/security-logs?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <AdminPageHeader
        title="Logs de sécurité"
        subtitle={`${formatCountSafe(total)} événements enregistrés`}
        action={
          <AdminPills
            options={ACTION_FILTERS}
            value={action}
            onChange={(v) => {
              setAction(v);
              setPage(1);
            }}
          />
        }
      />

      <div className="relative mb-6">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="IP, email, identifiant utilisateur…"
          className="w-full h-10 pl-10 pr-4 rounded-none bg-transparent border border-white/[0.08] text-sm text-white placeholder:text-white/25 font-light focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-colors"
        />
      </div>

      {isLoading ? (
        <AdminLoading />
      ) : logs.length === 0 ? (
        <AdminPanel title="Journal">
          <AdminEmpty
            icon={Shield}
            title="Aucun événement enregistré"
            description="C’est normal tant qu’aucune connexion ou action sensible n’a été journalisée. Connectez-vous ou changez un mot de passe pour voir des entrées."
          />
        </AdminPanel>
      ) : (
        <>
          <AdminPanel title="Événements récents">
            <ul className="divide-y divide-white/[0.04]">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 py-3.5 sm:items-center hover:bg-primary/[0.02] -mx-2 px-2 rounded-none transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {log.success !== false ? (
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={15} className="text-red-400 shrink-0" />
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-none bg-white/[0.04] text-white/50 border border-white/[0.06] font-mono">
                      {log.action}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-white/85 truncate">
                      {log.email ?? log.userId ?? "Anonyme"}
                    </p>
                    <p className="text-[11px] text-white/30 font-mono truncate">
                      {log.ipAddress ?? "—"}
                    </p>
                  </div>
                  <span className="text-[11px] text-white/35">{log.countryCode ?? "—"}</span>
                  <span className="text-[11px] text-white/35 whitespace-nowrap sm:text-right">
                    {formatRelative(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </AdminPanel>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

interface SecurityLog {
  id: string;
  action: string;
  email?: string;
  userId?: string;
  ipAddress?: string;
  countryCode?: string;
  success?: boolean;
  createdAt: string;
}

function formatCountSafe(n: number): string {
  return n.toLocaleString("fr-CI");
}
