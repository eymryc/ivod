"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, CheckCircle2, Lock, Clock, Play, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { formatXOF } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPills,
  AdminLoading,
  AdminEmpty,
  AdminPrimaryButton,
} from "@/components/admin/AdminShell";
import { inputClsSm as inputCls } from "@/lib/ui/cinema-field";
import { IvodSelect } from "@/components/ui/IvodField";

const STATUS_FILTERS = [
  { code: "" as const, label: "Tous" },
  { code: "DRAFT" as const, label: "Brouillon" },
  { code: "LOCKED" as const, label: "Finalisé" },
  { code: "PAID" as const, label: "Payé" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: { label: "Brouillon", color: "text-white/45", icon: <Clock size={13} /> },
  LOCKED: { label: "Finalisé", color: "text-blue-400/90", icon: <Lock size={13} /> },
  PAID: { label: "Payé", color: "text-emerald-400/90", icon: <CheckCircle2 size={13} /> },
};

function beneficiaryLabel(s: {
  content?: { title?: string };
  beneficiaryId?: string;
}) {
  if (s.content?.title) return s.content.title;
  if (s.beneficiaryId) return s.beneficiaryId;
  return "Bénéficiaire";
}

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jui",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

const monthOptions = MONTH_LABELS.map((label, i) => ({
  value: String(i + 1),
  label,
}));

export default function AdminRevenuePage() {
  const [status, setStatus] = useState("");
  const [calcYear, setCalcYear] = useState(new Date().getFullYear());
  const [calcMonth, setCalcMonth] = useState(new Date().getMonth() + 1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-statements", status],
    queryFn: () => adminApi.getStatements({ status: status || undefined }),
    staleTime: 60_000,
  });

  const calculateMutation = useMutation({
    mutationFn: () => adminApi.calculateRevenue(calcYear, calcMonth),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-statements"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => adminApi.payStatement(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-statements"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const statements: any[] = (data as any)?.items ?? [];
  const totalGross = statements
    .filter((s) => s.status?.code === "LOCKED")
    .reduce((sum, s) => sum + (s.grossAmount ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Finance"
        subtitle="Gestion des relevés de revenus créateurs et ayants droit"
      />

      <AdminPanel title="Calculer les revenus" className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[11px] text-white/35 font-medium mb-1.5 uppercase tracking-wide">
              Année
            </label>
            <input
              type="number"
              value={calcYear}
              onChange={(e) => setCalcYear(+e.target.value)}
              min={2020}
              max={2030}
              className={`${inputCls} w-24 text-center tabular-nums`}
            />
          </div>
          <IvodSelect
            id="revenue-month"
            label="Mois"
            value={String(calcMonth)}
            onChange={(v) => setCalcMonth(+v)}
            options={monthOptions}
            searchable
            className="min-w-[120px]"
          />
          <AdminPrimaryButton
            onClick={() => calculateMutation.mutate()}
            icon={calculateMutation.isPending ? Loader2 : Play}
          >
            {calculateMutation.isPending ? "Calcul…" : "Calculer"}
          </AdminPrimaryButton>
        </div>
        {totalGross > 0 && (
          <p className="text-[12px] text-white/40 font-light mt-4">
            Montant total à distribuer (LOCKED) :{" "}
            <span className="text-white/80 font-medium tabular-nums">{formatXOF(totalGross)}</span>
          </p>
        )}
      </AdminPanel>

      <div className="mb-6">
        <AdminPills
          options={STATUS_FILTERS}
          value={status}
          onChange={(code) => setStatus(code)}
        />
      </div>

      {isLoading ? (
        <AdminLoading />
      ) : statements.length === 0 ? (
        <AdminEmpty icon={DollarSign} title="Aucun relevé dans cette catégorie." />
      ) : (
        <AdminPanel title={`${statements.length} relevé${statements.length > 1 ? "s" : ""}`}>
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-3 mb-1 border-b border-white/[0.05] text-[10px] uppercase tracking-[0.12em] text-white/30 font-medium">
            <span>Bénéficiaire · Période</span>
            <span className="text-right">Brut</span>
            <span className="text-right">Net</span>
            <span>Statut</span>
            <span />
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {statements.map((s: any) => {
              const statusCode = s.status?.code ?? "DRAFT";
              const cfg = STATUS_CONFIG[statusCode] ?? STATUS_CONFIG.DRAFT;
              const period = new Date(s.periodStart).toLocaleDateString("fr-CI", {
                month: "long",
                year: "numeric",
              });

              return (
                <li
                  key={s.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3 md:gap-4 py-4 first:pt-0 last:pb-0 items-center"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white/90 truncate">
                      {beneficiaryLabel(s)}
                    </p>
                    <p className="text-[11px] text-white/35 font-light capitalize">{period}</p>
                  </div>
                  <p className="text-[13px] text-white/45 text-right tabular-nums">
                    {formatXOF(s.grossAmount ?? 0)}
                  </p>
                  <p className="text-[13px] font-medium text-white/85 text-right tabular-nums">
                    {formatXOF(s.netDistributable ?? 0)}
                  </p>
                  <div className={`flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
                    {cfg.icon}
                    <span>{s.status?.label ?? cfg.label}</span>
                  </div>
                  <div className="flex justify-end">
                    {statusCode === "LOCKED" ? (
                      <button
                        type="button"
                        onClick={() => payMutation.mutate(s.id)}
                        disabled={payMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-none text-[11px] font-medium border border-emerald-500/25 bg-emerald-500/10 text-emerald-400/90 hover:bg-emerald-500/15 transition-colors"
                      >
                        {payMutation.isPending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                        Payer
                      </button>
                    ) : (
                      <span className="w-16" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
