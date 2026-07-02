"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Film, Users } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { formatCount, formatDate, formatDuration, formatRelative, formatXOF } from "@/lib/utils/format";
import {
  AdminPageHeader,
  AdminPanel,
  AdminLoading,
} from "@/components/admin/AdminShell";

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-readable-muted mb-1">{label}</p>
      <p className={`text-[13px] text-white ${mono ? "font-mono text-[12px] break-all" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function AdminCreatorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: creator, isLoading, isError } = useQuery({
    queryKey: ["admin-creator", id],
    queryFn: () => adminApi.getCreator(id),
    enabled: !!id,
  });

  if (isLoading) return <div className="max-w-5xl mx-auto px-5 py-10"><AdminLoading /></div>;

  if (isError || !creator) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <p className="text-readable-dim">Créateur introuvable.</p>
        <Link href="/admin/creators" className="text-primary text-sm mt-4 inline-block hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const displayName =
    creator.stageName ??
    [creator.user?.firstName, creator.user?.lastName].filter(Boolean).join(" ") ??
    "—";

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-2 text-[13px] text-readable-dim hover:text-primary mb-8"
      >
        <ArrowLeft size={15} />
        Retour aux créateurs
      </Link>

      <AdminPageHeader
        title={displayName}
        subtitle={
          creator.verified
            ? "Créateur vérifié"
            : creator.invitePending
              ? "Invitation en attente"
              : "Créateur"
        }
        action={
          creator.verified ? (
            <span className="inline-flex items-center gap-1.5 text-primary text-sm">
              <ShieldCheck size={16} />
              Vérifié
            </span>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AdminPanel title="Profil créateur">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="ID créateur" value={creator.id} mono />
            <Field label="Nom de scène" value={creator.stageName} />
            <Field label="Bio" value={creator.bio || "—"} />
            <Field label="Abonnés" value={formatCount(creator.subscriberCount ?? 0)} />
            <Field label="Revenus cumulés" value={formatXOF(creator.totalEarned ?? 0)} />
            <Field
              label="Vérifié"
              value={
                creator.verified
                  ? `Oui — ${creator.verifiedAt ? formatDate(creator.verifiedAt) : ""}`
                  : "Non"
              }
            />
            <Field label="Créé le" value={formatDate(creator.createdAt)} />
            <Field label="Mis à jour" value={formatDate(creator.updatedAt)} />
            <Field label="Avatar (clé)" value={creator.avatarObjectKey} mono />
            <Field label="Bannière (clé)" value={creator.bannerObjectKey} mono />
          </div>
        </AdminPanel>

        <AdminPanel title="Compte utilisateur">
          {creator.user ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="ID utilisateur" value={creator.user.id} mono />
              <Field
                label="Nom complet"
                value={[creator.user.firstName, creator.user.lastName].filter(Boolean).join(" ") || "—"}
              />
              <Field label="E-mail" value={creator.user.email} />
              <Field label="Téléphone" value={creator.user.phone} />
              <Field label="Compte actif" value={creator.user.isActive ? "Oui" : "Non"} />
              <Field
                label="Mot de passe"
                value={creator.user.hasPassword ? "Défini" : "Invitation en attente"}
              />
              <Field
                label="Changement MDP requis"
                value={creator.user.mustChangePassword ? "Oui" : "Non"}
              />
              <Field
                label="Rôles"
                value={
                  creator.user.roles?.length
                    ? creator.user.roles.map((r: { label: string }) => r.label).join(", ")
                    : "—"
                }
              />
              <Field label="Inscription" value={formatDate(creator.user.createdAt)} />
            </div>
          ) : (
            <p className="text-readable-muted text-sm">Aucun utilisateur lié.</p>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title={`Catalogue (${creator.contentCount ?? creator.contents?.length ?? 0} contenus)`}
      >
        {!creator.contents?.length ? (
          <p className="text-readable-muted text-sm">Aucun contenu publié ou en cours.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {creator.contents.map((c: any) => (
              <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.title}</p>
                  <p className="text-[11px] text-readable-muted">
                    {c.contentTypeLabel ?? c.contentType} · {c.statusLabel ?? c.status}
                    {c.duration > 0 ? ` · ${formatDuration(c.duration)}` : ""} ·{" "}
                    {formatCount(c.viewCount ?? 0)} vues
                  </p>
                </div>
                <span className="text-[11px] text-readable-muted">{formatRelative(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <div className="mt-6 flex flex-wrap gap-3 text-[12px] text-readable-muted">
        <span className="inline-flex items-center gap-1">
          <Film size={12} /> {creator.contentCount ?? 0} contenus
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> {creator.followerCount ?? 0} followers
        </span>
      </div>
    </div>
  );
}
