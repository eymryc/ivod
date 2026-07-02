"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Film,
  UserCheck,
  DollarSign,
  Flag,
  ArrowRight,
  Clock,
  Eye,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { StatsChart } from "@/components/studio/StatsChart";
import {
  AdminPageHeader,
  AdminKpiCard,
  AdminPanel,
  AdminPanelLink,
  AdminLoading,
} from "@/components/admin/AdminShell";
import { formatXOF, formatCount } from "@/lib/utils/format";
import {
  type AdminDashboard,
  formatAdminChartDate,
} from "@/lib/types/admin-dashboard";

function AlertCard({
  href,
  title,
  sub,
  count,
  icon: Icon,
  variant,
}: {
  href: string;
  title: string;
  sub: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  variant: "amber" | "red";
}) {
  const styles = {
    amber: "border-secondary/25 bg-secondary/[0.06] hover:bg-secondary/[0.1]",
    red: "border-red-500/20 bg-red-500/[0.05] hover:bg-red-500/[0.08]",
  };
  const iconColor = variant === "amber" ? "text-secondary" : "text-red-400";
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-none border transition-colors ${styles[variant]}`}
    >
      <div className={`w-10 h-10 rounded-none flex items-center justify-center shrink-0 bg-white/[0.04]`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/85">{title}</p>
        <p className="text-[11px] text-white/35 font-light">{sub}</p>
      </div>
      <span className="text-xl font-semibold text-white/80 tabular-nums">{count}</span>
      <ArrowRight size={14} className="text-white/20 shrink-0" />
    </Link>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard() as Promise<AdminDashboard>,
    staleTime: 3 * 60_000,
  });

  const { data: pendingContents } = useQuery({
    queryKey: ["admin-contents", "PENDING_REVIEW", 5],
    queryFn: () => adminApi.getContents({ status: "PENDING_REVIEW", limit: 5 }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AdminLoading />
      </div>
    );
  }

  const viewsChart =
    data?.weeklyViews?.map((d) => ({
      label: formatAdminChartDate(d.date),
      value: d.views,
    })) ?? [];

  const revenueChart = data?.monthlyRevenue12m ?? [];
  const pendingItems: { id: string; title: string; creator?: { stageName?: string } }[] =
    (pendingContents as { items?: typeof pendingItems })?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <AdminPageHeader
        title="Back-office"
        subtitle="Vue d'ensemble plateforme iVOD — données temps réel"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <AdminKpiCard
          label="Utilisateurs"
          value={formatCount(data?.users.total ?? 0)}
          sub={`+${formatCount(data?.users.newThisMonth ?? 0)} ce mois`}
          icon={Users}
          href="/admin/users"
        />
        <AdminKpiCard
          label="Créateurs"
          value={formatCount(data?.creators.total ?? 0)}
          icon={UserCheck}
          href="/admin/creators"
          accent="emerald"
        />
        <AdminKpiCard
          label="Contenus"
          value={formatCount(data?.contents.total ?? 0)}
          sub={`${formatCount(data?.contents.published ?? 0)} publiés`}
          icon={Film}
          href="/admin/contents"
          accent="secondary"
        />
        <AdminKpiCard
          label="Revenus (mois)"
          value={formatXOF(data?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          href="/admin/revenue"
          accent="amber"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <AlertCard
          href="/admin/contents?status=PENDING_REVIEW"
          title="Contenus en attente"
          sub="À valider"
          count={data?.contents.pending ?? 0}
          icon={Clock}
          variant="amber"
        />
        <AlertCard
          href="/admin/moderation"
          title="Signalements"
          sub="À traiter"
          count={data?.pendingReports ?? 0}
          icon={Flag}
          variant="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {viewsChart.some((d) => d.value > 0) && (
          <AdminPanel title="Vues — 7 jours">
            <div className="flex items-center gap-2 mb-4 text-[12px] text-white/40">
              <Eye size={14} className="text-primary/50" />
              {formatCount(data?.views7d ?? 0)} vues sur la période
            </div>
            <StatsChart data={viewsChart} type="area" color="#f97316" unit="vues" height={180} />
          </AdminPanel>
        )}
        {revenueChart.length > 0 && (
          <AdminPanel title="Revenus — 12 mois">
            <StatsChart
              data={revenueChart.map((d) => ({ label: d.month, value: d.amount }))}
              type="bar"
              color="#eab308"
              height={180}
            />
          </AdminPanel>
        )}
      </div>

      {pendingItems.length > 0 && (
        <AdminPanel
          title="File de validation"
          action={
            <AdminPanelLink href="/admin/contents?status=PENDING_REVIEW">
              Tout voir
            </AdminPanelLink>
          }
        >
          <ul className="divide-y divide-white/[0.04]">
            {pendingItems.map((c) => (
              <li key={c.id}>
                <Link
                  href="/admin/contents?status=PENDING_REVIEW"
                  className="group flex items-center gap-4 py-3.5 -mx-1 px-1 rounded-none hover:bg-primary/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/90 truncate group-hover:text-primary transition-colors">
                      {c.title}
                    </p>
                    <p className="text-[11px] text-white/35 font-light">
                      {c.creator?.stageName ?? "Créateur inconnu"}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-white/15 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
