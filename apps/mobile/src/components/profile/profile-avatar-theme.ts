import { colors } from "@/theme/colors";

/** Dégradés avatar profil — alignés web ProfileCard */
export const PROFILE_AVATAR_GRADIENTS = [
  [colors.purple, colors.magenta],
  [colors.magenta, colors.orange],
  [colors.orange, colors.gold],
  ["#4338ca", colors.purple],
  ["#0d9488", "#059669"],
] as const;

export function profileAvatarGradient(name: string): readonly [string, string] {
  const i = (name?.charCodeAt(0) ?? 0) % PROFILE_AVATAR_GRADIENTS.length;
  return PROFILE_AVATAR_GRADIENTS[i];
}
