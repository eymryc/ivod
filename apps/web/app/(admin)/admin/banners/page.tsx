"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Image as ImageIcon } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import {
  AdminPrimaryButton,
  AdminLoading,
  AdminEmpty,
  AdminPanel,
} from "@/components/admin/AdminShell";
import {
  BannerAdminCard,
  type BannerListItem,
} from "@/components/admin/banners/BannerAdminCard";
import { BannerListSummary } from "@/components/admin/banners/BannerListSummary";

export default function BannersPage() {
  const qc = useQueryClient();

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: adminApi.getBanners,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBanner(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateBanner(id, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  const list: BannerListItem[] = useMemo(
    () => [...(banners ?? [])].sort((a, b) => a.position - b.position),
    [banners],
  );

  const summary = useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let active = 0;
    for (const b of list) {
      impressions += b.impressionCount ?? 0;
      clicks += b.clickCount ?? 0;
      if (b.isActive) active += 1;
    }
    return { impressions, clicks, active, total: list.length };
  }, [list]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-[13px] leading-relaxed text-white/40">
          Gérez le carrousel hero — visuels desktop & mobile, ciblage par plan et pays.
        </p>
        <AdminPrimaryButton href="/admin/banners/new" icon={Plus}>
          Nouvelle bannière
        </AdminPrimaryButton>
      </div>

      {isLoading ? (
        <AdminLoading />
      ) : list.length === 0 ? (
        <AdminEmpty
          icon={ImageIcon}
          title="Aucune bannière configurée"
          description="Créez votre première bannière pour le hero de la homepage."
          action={
            <AdminPrimaryButton href="/admin/banners/new" icon={Plus}>
              Créer une bannière
            </AdminPrimaryButton>
          }
        />
      ) : (
        <>
          <BannerListSummary
            total={summary.total}
            active={summary.active}
            impressions={summary.impressions}
            clicks={summary.clicks}
          />

          <AdminPanel title={`${list.length} bannière${list.length > 1 ? "s" : ""}`}>
            <div className="-mx-5 -my-1 space-y-3 sm:-mx-6">
              {list.map((b) => (
                <BannerAdminCard
                  key={b.id}
                  banner={b}
                  onToggle={() => toggleMutation.mutate({ id: b.id, isActive: b.isActive })}
                  onDelete={() => {
                    if (confirm(`Supprimer « ${b.title} » ?`)) deleteMutation.mutate(b.id);
                  }}
                  deletePending={deleteMutation.isPending}
                />
              ))}
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}
