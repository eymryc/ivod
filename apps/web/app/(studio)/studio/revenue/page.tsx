"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  Wallet,
  Info,
  Film,
} from "lucide-react";
import { revenueApi } from "@/lib/api/revenue";
import {
  StudioPageHeader,
  StudioKpiCard,
  StudioPanel,
  StudioPeriodPills,
  StudioLoading,
  StudioEmpty,
} from "@/components/studio/StudioShell";
import { formatXOF } from "@/lib/utils/format";

const PAYSTACK_INFO =
  "Les revenus créateur sont calculés par iVOD. Les spectateurs paient via un prestataire sécurisé (abonnements & achats à l'unité) ; vos reversements suivent le calendrier des relevés ci-dessous.";

const STATUS_FILTERS = [
  { code: "", label: "Tous" },
  { code: "PAID", label: "Payés" },
  { code: "LOCKED", label: "Finalisés" },
  { code: "DRAFT", label: "Brouillons" },
] as const;

const STATUS_UI: Record<
  string,
  { label: string; dot: string; text: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  DRAFT: { label: "Brouillon", dot: "bg-white/35", text: "text-white/45", icon: Clock },
  LOCKED: { label: "Finalisé", dot: "bg-secondary", text: "text-secondary", icon: Lock },
  PAID: { label: "Payé", dot: "bg-emerald-400", text: "text-emerald-400/90", icon: CheckCircle2 },
};

interface RevenueStatement {
  id: string;
  status: { code: string; label?: string };
  periodStart: string;
  periodEnd?: string;
  paidAt?: string | null;
  grossAmount: number;
  netDistributable: number;
  beneficiaryAmount: number;
  content?: { id: string; title: string } | null;
}

function statementStatusCode(s: RevenueStatement): string {
  return typeof s.status === "string" ? s.status : s.status?.code ?? "DRAFT";
}

function StatementRow({ statement: s }: { statement: RevenueStatement }) {
  const code = statementStatusCode(s);
  const ui = STATUS_UI[code] ?? STATUS_UI.DRAFT;
  const StatusIcon = ui.icon;
  const net = s.beneficiaryAmount ?? s.netDistributable ?? 0;
  const period = new Date(s.periodStart).toLocaleDateString("fr-CI", {
    month: "long",
    year: "numeric",
  });

  return (
    <li className="group relative">
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 sm:gap-6 py-4 sm:items-center hover:bg-primary/[0.03] -mx-2 px-3 rounded-none transition-colors">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/90 capitalize">{period}</p>
          {s.content?.title && (
            <p className="text-[11px] text-white/35 font-light mt-0.5 truncate inline-flex items-center gap-1">
              <Film size={11} className="shrink-0 text-primary/40" />
              {s.content.title}
            </p>
          )}
          {s.paidAt && (
            <p className="text-[11px] text-emerald-400/60 font-light mt-1">
              Versé le{" "}
              {new Date(s.paidAt).toLocaleDateString("fr-CI", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          <div className="sm:hidden flex flex-wrap gap-4 mt-2 text-[12px] tabular-nums">
            <span className="text-white/40">Brut {formatXOF(s.grossAmount)}</span>
            <span className="font-medium text-primary/90">Net {formatXOF(net)}</span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-0.5 tabular-nums">
          <span className="text-[11px] text-white/30">Brut</span>
          <span className="text-[13px] text-white/45">{formatXOF(s.grossAmount)}</span>
        </div>

        <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center gap-3">
          <div className="sm:text-right tabular-nums">
            <span className="sm:hidden text-[11px] text-white/30 mr-2">Net</span>
            <span className="text-[15px] font-semibold text-white/90">{formatXOF(net)}</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-none border border-white/[0.06] bg-white/[0.02] ${ui.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />
            <StatusIcon size={12} className="opacity-80" />
            <span>{ui.label}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function RevenuePage() {
  const [statusFilter, setStatusFilter] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["revenue-statements", statusFilter],
    queryFn: ({ pageParam = 1 }) =>
      revenueApi.getMyStatements(
        pageParam as number,
        20,
        statusFilter || undefined,
      ),
    getNextPageParam: (lastPage: { items?: RevenueStatement[]; total?: number }, allPages) => {
      const loaded = allPages.flatMap((p) => p?.items ?? []).length;
      return loaded < (lastPage?.total ?? 0) ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60_000,
  });

  const statements: RevenueStatement[] = data?.pages.flatMap((p) => p?.items ?? []) ?? [];

  const { totalPaid, totalPending, totalDraft } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let draft = 0;
    for (const s of statements) {
      const code = statementStatusCode(s);
      const net = s.beneficiaryAmount ?? s.netDistributable ?? 0;
      if (code === "PAID") paid += net;
      else if (code === "LOCKED") pending += net;
      else if (code === "DRAFT") draft += net;
    }
    return { totalPaid: paid, totalPending: pending, totalDraft: draft };
  }, [statements]);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <StudioPageHeader
        title="Revenus"
        subtitle={PAYSTACK_INFO}
        action={
          <StudioPeriodPills
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StudioKpiCard
          label="Total versé"
          value={formatXOF(totalPaid)}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StudioKpiCard
          label="En attente"
          value={formatXOF(totalPending)}
          sub="Relevés finalisés"
          icon={Wallet}
          accent="secondary"
        />
        <StudioKpiCard
          label="Brouillons"
          value={formatXOF(totalDraft)}
          sub="En cours de calcul"
          icon={Clock}
        />
      </div>

      <div className="flex items-start gap-3 mb-8 p-4 rounded-none border border-white/[0.06] bg-white/[0.01]">
        <Info size={16} className="text-primary/50 shrink-0 mt-0.5" />
        <p className="text-[12px] text-white/40 font-light leading-relaxed">
          Les relevés sont générés chaque mois après clôture. Le montant{" "}
          <span className="text-white/60">Net</span> correspond à votre part créateur après répartition.
        </p>
      </div>

      {isLoading ? (
        <StudioLoading />
      ) : statements.length === 0 ? (
        <StudioPanel title="Relevés">
          <StudioEmpty
            icon={FileText}
            title={statusFilter ? "Aucun relevé pour ce filtre" : "Aucun relevé pour le moment"}
            description="Les relevés apparaissent après publication et calcul mensuel des revenus."
            action={
              !statusFilter ? (
                <Link
                  href="/studio/contents"
                  className="text-[13px] text-primary hover:underline"
                >
                  Voir mon catalogue →
                </Link>
              ) : undefined
            }
          />
        </StudioPanel>
      ) : (
        <>
          <StudioPanel
            title={`${statements.length} relevé${statements.length > 1 ? "s" : ""}`}
            className="mb-6"
          >
            <ul className="divide-y divide-white/[0.04]">
              {statements.map((s) => (
                <StatementRow key={s.id} statement={s} />
              ))}
            </ul>
          </StudioPanel>

          {hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/50 hover:text-primary hover:border-primary/25 transition-colors disabled:opacity-40"
              >
                {isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
                Charger plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
