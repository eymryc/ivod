"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { BannerFormWizard } from "@/components/admin/banners/BannerFormWizard";
import { AdminLoading } from "@/components/admin/AdminShell";
import type { BannerRecord } from "@/components/admin/banners/banner-form.types";

export default function EditBannerPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: banners, isLoading, isError } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: adminApi.getBanners,
    staleTime: 60_000,
  });

  const banner = (banners as BannerRecord[] | undefined)?.find((b) => b.id === id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <AdminLoading />
      </div>
    );
  }

  if (isError || !banner) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center sm:px-8">
        <p className="text-sm text-white/50">Bannière introuvable.</p>
        <Link
          href="/admin/banners"
          className="mt-4 inline-flex items-center gap-2 text-[13px] text-primary hover:text-primary/80"
        >
          <ArrowLeft size={16} />
          Retour aux bannières
        </Link>
      </div>
    );
  }

  return <BannerFormWizard mode="edit" banner={banner} />;
}
