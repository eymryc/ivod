"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/feedback";
import { ProfileCard } from "./ProfileCard";
import { ParentalPinModal } from "./ParentalPinModal";
import { CreateProfileModal } from "./CreateProfileModal";
import { useProfileStore, type Profile } from "@/lib/stores/profile.store";
import { profilesApi } from "@/lib/api/profiles";
import { profileHasPin } from "@/lib/profile-utils";
import { ApiError } from "@/lib/api/client";

interface ProfileSelectorProps {
  profiles: Profile[];
  initialAddOpen?: boolean;
}

type PinAction = { profile: Profile; mode: "select" | "edit" };

export function ProfileSelector({ profiles, initialAddOpen = false }: ProfileSelectorProps) {
  const router = useRouter();
  const { setActiveProfile, activeProfileId } = useProfileStore();
  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(initialAddOpen);

  const verifyPinMutation = useMutation({
    mutationFn: ({ profileId, pin }: { profileId: string; pin: string }) =>
      profilesApi.verifyPin(profileId, pin),
    onSuccess: (_data, { profileId }) => {
      const mode = pinAction?.mode ?? "select";
      setPinAction(null);
      setPinError(null);
      if (mode === "edit") {
        router.push(`/profiles/${profileId}/edit`);
        return;
      }
      setActiveProfile(profileId);
      router.push("/");
    },
    onError: (err: ApiError) => setPinError(getApiErrorMessage(err) ?? "Mot de passe incorrect"),
  });

  const requestPin = (profile: Profile, mode: "select" | "edit") => {
    setPinAction({ profile, mode });
    setPinError(null);
  };

  const handleSelect = (profile: Profile) => {
    if (profileHasPin(profile)) {
      requestPin(profile, "select");
      return;
    }
    setActiveProfile(profile.id);
    router.push("/");
  };

  const handleEdit = (profile: Profile) => {
    if (profileHasPin(profile)) {
      requestPin(profile, "edit");
      return;
    }
    router.push(`/profiles/${profile.id}/edit`);
  };

  const handlePinConfirm = (pin: string) => {
    if (!pinAction) return;
    setPinError(null);
    verifyPinMutation.mutate({ profileId: pinAction.profile.id, pin });
  };

  return (
    <>
      <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:flex sm:flex-wrap sm:justify-center gap-6 sm:gap-8 md:gap-10 lg:gap-12 max-w-lg sm:max-w-none mx-auto">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            size="lg"
            isActive={activeProfileId === profile.id}
            onClick={() => handleSelect(profile)}
            showEdit
            onEdit={() => handleEdit(profile)}
          />
        ))}

        {profiles.length < 5 && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex flex-col items-center gap-3 w-[8.25rem] group"
            aria-label="Ajouter un profil"
          >
            <span className="profile-card-add flex w-[7.5rem] h-[7.5rem] items-center justify-center border-2 border-dashed border-white/20 bg-white/[0.02] text-white/40 transition-all duration-300 group-hover:border-brand-magenta/50 group-hover:text-brand-magenta group-hover:bg-brand-magenta/[0.06] group-hover:shadow-[0_0_24px_rgba(230,0,126,0.12)]">
              <Plus size={36} strokeWidth={1.5} />
            </span>
            <span className="text-sm font-semibold text-white/50 group-hover:text-white/80 transition-colors">
              Ajouter
            </span>
          </button>
        )}
      </div>

      <CreateProfileModal open={addOpen} onClose={() => setAddOpen(false)} />

      {pinAction && (
        <ParentalPinModal
          profileName={pinAction.profile.name}
          purpose={pinAction.mode}
          onConfirm={handlePinConfirm}
          onCancel={() => {
            setPinAction(null);
            setPinError(null);
          }}
          error={pinError}
          isLoading={verifyPinMutation.isPending}
        />
      )}
    </>
  );
}
