"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  RotateCcw,
  Shield,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { formatXOF, formatRelative } from "@/lib/utils/format";
import { paymentStatusCode } from "@/lib/utils/payment-status";
import { AdminLoading, AdminEmpty } from "@/components/admin/AdminShell";
import { RefundPaymentButton } from "@/components/admin/RefundPaymentButton";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ApiError } from "@/lib/api/client";

const STATUS_FILTERS = [
  { code: "", label: "Tous" },
  { code: "PENDING", label: "En attente" },
  { code: "COMPLETED", label: "Complétés" },
  { code: "FAILED", label: "Échoués" },
  { code: "REFUNDED", label: "Remboursés" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "admin-pay-badge--completed",
  PENDING: "admin-pay-badge--pending",
  FAILED: "admin-pay-badge--failed",
  REFUNDED: "admin-pay-badge--refunded",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 size={12} strokeWidth={2.5} />,
  PENDING: <Clock size={12} strokeWidth={2.5} />,
  FAILED: <XCircle size={12} strokeWidth={2.5} />,
  REFUNDED: <RotateCcw size={12} strokeWidth={2.5} />,
};

function PayStatusBadge({ code, label }: { code: string; label: string }) {
  const cls = STATUS_BADGE[code] ?? "admin-pay-badge--pending";
  return (
    <span className={`admin-pay-badge ${cls}`}>
      {STATUS_ICON[code]}
      {label}
    </span>
  );
}

export default function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"payments" | "refunds">("payments");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", status, search, page],
    queryFn: () =>
      adminApi.getPayments({
        page,
        limit: 25,
        status: status || undefined,
        provider: "PAYSTACK",
        search: search.trim() || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: refundsData, isLoading: refundsLoading } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: () => adminApi.getRefunds({ page: 1, limit: 30 }),
    enabled: tab === "refunds",
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      adminApi.processRefundRequest(id, action),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const items: any[] = data?.items ?? [];
  const stats = data?.stats;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const refundItems: any[] = refundsData?.items ?? [];
  const byStatus: { status: string; label?: string; count: number }[] = stats?.byStatus ?? [];

  return (
    <div className="admin-payments-page max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-8">
      <div className="admin-payments-page__glow" aria-hidden />

      <header className="admin-payments-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase ivod-gradient-text mb-2">
              Monétisation
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Paiements
            </h1>
            <div className="ivod-line-accent w-14 mt-4 mb-4" />
            <p className="text-sm text-white/50 font-light max-w-xl leading-relaxed">
              Transactions abonnements et achats TVOD — réconciliation, remboursements et webhooks
              temps réel.
            </p>
          </div>
          <span className="admin-payments-paystack-badge shrink-0">
            <Shield size={12} />
            PCI · Mobile Money
          </span>
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 admin-payments-kpi-featured">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40">
                Revenus encaissés
              </p>
              <p className="mt-3 text-3xl md:text-4xl font-bold ivod-gradient-text tabular-nums tracking-tight">
                {formatXOF(stats?.completedRevenue ?? 0)}
              </p>
              <p className="mt-2 text-xs text-white/45 font-light">
                {(stats?.completedCount ?? 0).toLocaleString("fr-FR")} paiement
                {(stats?.completedCount ?? 0) !== 1 ? "s" : ""} confirmé
                {(stats?.completedCount ?? 0) !== 1 ? "s" : ""}
                {" "}
                {status || search.trim() ? " (filtres actifs)" : " (historique)"}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Wallet size={20} strokeWidth={1.5} />
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {byStatus.length > 0 ? (
            byStatus.map((row) => (
              <div key={row.status} className="admin-payments-kpi-stat">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/35">
                  {row.label ?? row.status}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{row.count}</p>
              </div>
            ))
          ) : (
            <>
              <div className="admin-payments-kpi-stat">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/35">
                  Complétés
                </p>
                <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
                  {stats?.completedCount ?? 0}
                </p>
              </div>
              <div className="admin-payments-kpi-stat col-span-2 sm:col-span-2">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/35">
                  Total liste
                </p>
                <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{total}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="admin-payments-panel relative z-10 overflow-hidden">
        <div className="admin-payments-panel__glow" aria-hidden />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/[0.06]">
          <div className="admin-payments-segment">
            <button
              type="button"
              onClick={() => setTab("payments")}
              className={`admin-payments-segment__tab ${
                tab === "payments" ? "admin-payments-segment__tab--active" : ""
              }`}
            >
              Transactions
            </button>
            <button
              type="button"
              onClick={() => setTab("refunds")}
              className={`admin-payments-segment__tab ${
                tab === "refunds" ? "admin-payments-segment__tab--active" : ""
              }`}
            >
              Remboursements
            </button>
          </div>
          {tab === "payments" && total > 0 && (
            <p className="text-[11px] text-white/40 tabular-nums">
              {total} entrée{total > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {tab === "refunds" && (
            <>
              {refundsLoading ? (
                <AdminLoading />
              ) : refundItems.length === 0 ? (
                <AdminEmpty icon={RotateCcw} title="Aucun remboursement enregistré." />
              ) : (
                <div className="admin-payments-table-wrap overflow-x-auto">
                  <table className="admin-payments-table w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundItems.map((r: any) => {
                        const rCode = r.status?.code ?? "PENDING";
                        return (
                          <tr key={r.id}>
                            <td className="text-white/60 text-sm whitespace-nowrap">
                              {formatRelative(r.createdAt)}
                            </td>
                            <td>
                              <p className="text-sm font-medium text-white truncate max-w-[220px]">
                                {r.payment?.user?.email ?? "—"}
                              </p>
                            </td>
                            <td>
                              <span className="admin-payments-amount text-white">
                                {formatXOF(Number(r.amount))}
                              </span>
                            </td>
                            <td>
                              <PayStatusBadge
                                code={rCode}
                                label={r.status?.label ?? rCode}
                              />
                            </td>
                            <td className="text-right">
                              {r.status?.code === "REQUESTED" && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={approveMutation.isPending}
                                    onClick={() =>
                                      approveMutation.mutate({ id: r.id, action: "approve" })
                                    }
                                    className="ivod-btn px-3 py-1.5 text-[11px] font-semibold border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/10"
                                  >
                                    Approuver
                                  </button>
                                  <button
                                    type="button"
                                    disabled={approveMutation.isPending}
                                    onClick={() =>
                                      approveMutation.mutate({ id: r.id, action: "reject" })
                                    }
                                    className="ivod-btn px-3 py-1.5 text-[11px] font-semibold border border-red-500/35 text-red-400 hover:bg-red-500/10"
                                  >
                                    Refuser
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "payments" && (
            <>
              <div className="flex flex-col xl:flex-row gap-4 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                  />
                  <input
                    type="search"
                    placeholder="Email, ID, référence…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="admin-payments-search ivod-search-input w-full"
                  />
                </div>
                <div className="admin-payments-filters shrink-0">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.code || "all"}
                      type="button"
                      onClick={() => {
                        setStatus(f.code);
                        setPage(1);
                      }}
                      className={`admin-payments-filter ${
                        status === f.code ? "admin-payments-filter--active" : ""
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <AdminLoading />
              ) : items.length === 0 ? (
                <AdminEmpty icon={CreditCard} title="Aucun paiement pour ces filtres." />
              ) : (
                <div className="admin-payments-table-wrap overflow-x-auto">
                  <table className="admin-payments-table w-full min-w-[800px]">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Utilisateur</th>
                        <th>Montant</th>
                        <th>Type</th>
                        <th>Fournisseur</th>
                        <th>Statut</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p: any) => {
                        const code = paymentStatusCode(p.status);
                        const statusLbl =
                          typeof p.status === "object" ? p.status?.label ?? code : code;
                        const typeLabel = p.content?.title
                          ? `TVOD · ${p.content.title}`
                          : p.userSubscription?.plan?.label
                            ? `Abo · ${p.userSubscription.plan.label}`
                            : "—";
                        return (
                          <tr key={p.id}>
                            <td className="text-white/55 text-sm whitespace-nowrap">
                              {formatRelative(p.createdAt)}
                            </td>
                            <td>
                              <p className="text-sm font-semibold text-white truncate max-w-[220px]">
                                {p.user?.email ?? p.userId}
                              </p>
                              {(p.user?.firstName || p.user?.lastName) && (
                                <p className="text-[11px] text-white/40 mt-0.5">
                                  {[p.user.firstName, p.user.lastName].filter(Boolean).join(" ")}
                                </p>
                              )}
                            </td>
                            <td>
                              <span
                                className={`admin-payments-amount ${
                                  code === "COMPLETED" ? "admin-payments-amount--success" : "text-white"
                                }`}
                              >
                                {formatXOF(Number(p.amount))}
                              </span>
                            </td>
                            <td className="text-sm text-white/60 max-w-[200px] truncate">
                              {typeLabel}
                            </td>
                            <td className="text-xs text-white/45 max-w-[140px]">
                              {p.provider?.label ?? p.provider?.code ?? "—"}
                            </td>
                            <td>
                              <PayStatusBadge code={code} label={statusLbl} />
                            </td>
                            <td className="text-right">
                              {code === "COMPLETED" &&
                                p.refunds?.[0]?.status?.code !== "PROCESSED" && (
                                  <RefundPaymentButton
                                    paymentId={p.id}
                                    amount={Number(p.amount)}
                                  />
                                )}
                              {p.refunds?.[0] && (
                                <span className="block mt-1.5 text-[10px] text-orange-400/90 uppercase tracking-wide">
                                  {p.refunds[0].status?.label}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {total > 25 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-8 pt-6 border-t border-white/[0.06]">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="ivod-btn inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium border border-white/12 text-white/70 hover:text-white hover:border-white/20 disabled:opacity-35"
                  >
                    <ChevronLeft size={16} />
                    Précédent
                  </button>
                  <span className="text-sm text-white/45 tabular-nums px-2">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="ivod-btn inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium border border-white/12 text-white/70 hover:text-white hover:border-white/20 disabled:opacity-35"
                  >
                    Suivant
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <div className="admin-payments-foot mt-6 flex flex-wrap items-center gap-2 px-4 py-3 text-[11px] text-white/45">
                <ExternalLink size={13} className="text-brand-magenta/70 shrink-0" />
                <span>
                  Webhooks paiement :{" "}
                  <code className="text-white/55 font-mono text-[10px]">
                    charge.success · charge.failed · refund.processed
                  </code>
                  {" → "}
                  <code className="text-brand-magenta/80 font-mono text-[10px]">
                    /api/v1/payments/webhook/paystack
                  </code>
                </span>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
