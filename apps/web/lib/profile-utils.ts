import type { Profile } from "@/lib/stores/profile.store";

export function profileHasPin(profile: Profile): boolean {
  return profile.hasPin === true || profile.requirePin === true || !!profile.pin;
}
