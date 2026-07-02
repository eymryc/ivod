"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { showApiError } from "@/lib/api/feedback";
import { ProfileSelector } from "@/components/profile/ProfileSelector";
import { ProfilesShell } from "@/components/profile/ProfilesUI";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useProfiles } from "@/lib/hooks/useProfiles";
import { useProfileStore } from "@/lib/stores/profile.store";
import { profilesApi } from "@/lib/api/profiles";

function ProfilesPageContent() {
  const { profiles, isLoading } = useProfiles();
  const { activeProfileId, setActiveProfile, setProfiles } = useProfileStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openAddModal = searchParams.get("add") === "1";
  const [autoCreating, setAutoCreating] = useState(false);

  useEffect(() => {
    if (openAddModal) router.replace("/profiles", { scroll: false });
  }, [openAddModal, router]);

  const createDefaultMutation = useMutation({
    mutationFn: () => profilesApi.create({ name: "Mon profil" }),
    onSuccess: async (profile) => {
      const updated = await profilesApi.list();
      const list = Array.isArray(updated) ? updated : [];
      setProfiles(list);
      setActiveProfile(profile.id);
      router.push("/");
    },
    onError: (err) => {
      showApiError(err);
      setAutoCreating(false);
    },
  });

  useEffect(() => {
    if (isLoading) return;

    if (profiles.length === 0 && !autoCreating) {
      setAutoCreating(true);
      createDefaultMutation.mutate();
      return;
    }

    if (profiles.length === 1 && !profiles[0].hasPin && !activeProfileId) {
      setActiveProfile(profiles[0].id);
      router.push("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, isLoading, activeProfileId]);

  if (isLoading || autoCreating || createDefaultMutation.isPending) {
    return (
      <div className="relative min-h-screen page-canvas">
        <BrandLoader />
        {autoCreating && (
          <p className="absolute bottom-[18%] left-0 right-0 text-center text-sm text-white/50 flex items-center justify-center gap-2">
            <UserCircle2 size={16} className="text-brand-magenta" />
            Création de votre premier profil…
          </p>
        )}
      </div>
    );
  }

  return (
    <ProfilesShell showBack backHref="/" backLabel="Retour à l'accueil">
      <ProfileSelector profiles={profiles} initialAddOpen={openAddModal} />
      <p className="mt-12 text-center text-xs text-white/35 max-w-sm">
        Chaque profil possède son historique, ses favoris et ses préférences parental.
      </p>
    </ProfilesShell>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen page-canvas">
          <BrandLoader />
        </div>
      }
    >
      <ProfilesPageContent />
    </Suspense>
  );
}
