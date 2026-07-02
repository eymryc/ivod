"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { useProfileStore } from "../stores/profile.store";
import { profilesApi } from "../api/profiles";

export function useProfiles() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const { setProfiles, setActiveProfile, activeProfileId, getActiveProfile, profiles } = useProfileStore();

  const query = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const data = await profilesApi.list();
      setProfiles(data);
      return data;
    },
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  return {
    ...query,
    profiles,
    activeProfileId,
    activeProfile: getActiveProfile(),
    setActiveProfile,
  };
}
