"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { formatRelative } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPills,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";

const TAB_OPTIONS = [
  { code: "reports" as const, label: "Signalements" },
  { code: "queue" as const, label: "File" },
];

const ACTIONS: {
  code: "REVIEWED" | "DISMISSED" | "ACTIONED";
  label: string;
  color: string;
}[] = [
  {
    code: "REVIEWED",
    label: "Vu",
    color: "text-blue-400/90 border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/15",
  },
  {
    code: "DISMISSED",
    label: "Ignorer",
    color: "text-white/50 border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]",
  },
  {
    code: "ACTIONED",
    label: "Action prise",
    color: "text-red-400/90 border-red-500/25 bg-red-500/10 hover:bg-red-500/15",
  },
];

export default function ModerationPage() {
  const [tab, setTab] = useState<"reports" | "queue">("reports");
  const qc = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports", "PENDING"],
    queryFn: () => adminApi.getReports({ status: "PENDING" }),
    staleTime: 30_000,
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["admin-moderation-queue"],
    queryFn: () => adminApi.getModerationQueue({ status: "PENDING" }),
    staleTime: 30_000,
  });

  const handleReportMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "REVIEWED" | "DISMISSED" | "ACTIONED" }) =>
      adminApi.handleReport(id, action),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const assignMutation = useMutation({
    mutationFn: (id: string) => adminApi.assignItem(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-moderation-queue"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => adminApi.completeItem(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-moderation-queue"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const reportItems: any[] = (reports as any)?.items ?? [];
  const queueItems: any[] = (queue as any)?.items ?? [];

  const tabOptions = TAB_OPTIONS.map((t) => ({
    ...t,
    label:
      t.code === "reports"
        ? `Signalements (${reportItems.length})`
        : `File (${queueItems.length})`,
  }));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Signalements & modération"
        subtitle="Gérez les signalements utilisateurs et la file de modération"
      />

      <div className="mb-6">
        <AdminPills options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab === "reports" &&
        (reportsLoading ? (
          <AdminLoading />
        ) : reportItems.length === 0 ? (
          <AdminEmpty
            icon={CheckCircle2}
            title="Aucun signalement en attente."
            description="Tous les signalements ont été traités."
          />
        ) : (
          <AdminPanel title={`${reportItems.length} signalement${reportItems.length > 1 ? "s" : ""}`}>
            <ul className="divide-y divide-white/[0.04]">
              {reportItems.map((r: any) => (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-none border border-red-500/20 bg-red-500/10 flex items-center justify-center shrink-0">
                      <Flag size={14} className="text-red-400/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-none font-medium border border-red-500/25 bg-red-500/10 text-red-400/90">
                          {r.reason?.label ?? r.reason?.code ?? "—"}
                        </span>
                        <span className="text-[11px] text-white/30 font-light">
                          {formatRelative(r.createdAt)}
                        </span>
                      </div>
                      {r.content?.title && (
                        <p className="text-[13px] font-medium text-white/85 mt-1.5 truncate">
                          {r.content.title}
                        </p>
                      )}
                      {r.description && (
                        <p className="text-[11px] text-white/40 font-light mt-0.5 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <p className="text-[11px] text-white/35 font-light mt-1">
                        Profil : {r.profile?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-11">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.code}
                        type="button"
                        onClick={() => handleReportMutation.mutate({ id: r.id, action: a.code })}
                        disabled={handleReportMutation.isPending}
                        className={`px-3 py-1.5 rounded-none text-[11px] font-medium border transition-colors ${a.color}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </AdminPanel>
        ))}

      {tab === "queue" &&
        (queueLoading ? (
          <AdminLoading />
        ) : queueItems.length === 0 ? (
          <AdminEmpty
            icon={CheckCircle2}
            title="File de modération vide."
            description="Aucun élément en attente de traitement."
          />
        ) : (
          <AdminPanel title={`${queueItems.length} élément${queueItems.length > 1 ? "s" : ""}`}>
            <ul className="divide-y divide-white/[0.04]">
              {queueItems.map((item: any) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 hover:bg-primary/[0.03] rounded-none px-1 -mx-1 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/90 truncate">
                      {item.content?.title ?? item.type ?? "—"}
                    </p>
                    <p className="text-[11px] text-white/35 font-light mt-0.5">
                      Priorité : {item.priority?.label ?? "—"} · Statut :{" "}
                      {item.status?.label ?? "—"} · {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!item.assignedToUserId && (
                      <button
                        type="button"
                        onClick={() => assignMutation.mutate(item.id)}
                        disabled={assignMutation.isPending}
                        className="px-3 py-1.5 rounded-none text-[11px] font-medium border border-blue-500/25 bg-blue-500/10 text-blue-400/90 hover:bg-blue-500/15 transition-colors"
                      >
                        {assignMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin inline" />
                        ) : (
                          "Prendre en charge"
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate(item.id)}
                      disabled={completeMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-none text-[11px] font-medium border border-emerald-500/25 bg-emerald-500/10 text-emerald-400/90 hover:bg-emerald-500/15 transition-colors"
                    >
                      {completeMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Traité
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </AdminPanel>
        ))}
    </div>
  );
}
