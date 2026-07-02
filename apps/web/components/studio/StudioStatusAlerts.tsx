"use client";

import Link from "next/link";
import { AlertCircle, Clock, FileEdit } from "lucide-react";

interface StudioStatusAlertsProps {
  drafts: number;
  pending: number;
  rejected: number;
}

export function StudioStatusAlerts({ drafts, pending, rejected }: StudioStatusAlertsProps) {
  const alerts = [
    drafts > 0 && {
      key: "drafts",
      count: drafts,
      label: drafts > 1 ? "brouillons" : "brouillon",
      href: "/studio/contents?status=DRAFT",
      icon: FileEdit,
      tone: "text-brand-purple border-brand-purple/25 bg-brand-purple/[0.06]",
    },
    pending > 0 && {
      key: "pending",
      count: pending,
      label: "en attente de validation",
      href: "/studio/contents?status=PENDING_REVIEW",
      icon: Clock,
      tone: "text-brand-orange border-brand-orange/25 bg-brand-orange/[0.06]",
    },
    rejected > 0 && {
      key: "rejected",
      count: rejected,
      label: rejected > 1 ? "contenus rejetés" : "contenu rejeté",
      href: "/studio/contents?status=REJECTED",
      icon: AlertCircle,
      tone: "text-red-300 border-red-400/25 bg-red-500/[0.06]",
    },
  ].filter(Boolean) as Array<{
    key: string;
    count: number;
    label: string;
    href: string;
    icon: typeof FileEdit;
    tone: string;
  }>;

  if (alerts.length === 0) return null;

  return (
    <section className="mb-6 flex flex-wrap gap-2">
      {alerts.map(({ key, count, label, href, icon: Icon, tone }) => (
        <Link
          key={key}
          href={href}
          className={`inline-flex items-center gap-2 border px-3 py-2 text-[12px] transition-opacity hover:opacity-90 ${tone}`}
        >
          <Icon size={14} strokeWidth={1.75} />
          <span>
            <span className="font-semibold tabular-nums">{count}</span> {label}
          </span>
        </Link>
      ))}
    </section>
  );
}
