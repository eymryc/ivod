import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Crown, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { Profile } from "@/store/profile.store";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

type ProfileAccountSectionProps = {
  displayName: string;
  email?: string | null;
  planLabel: string;
  isPremium: boolean;
  activeProfile: Profile | null;
  profileCount?: number;
};

export function ProfileAccountSection({
  displayName,
  email,
  planLabel,
  isPremium,
  activeProfile,
  profileCount,
}: ProfileAccountSectionProps) {
  const router = useRouter();
  const initial = displayName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <PremiumPanel variant="hero" style={styles.panel}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accent}
      />
      <LinearGradient
        colors={["rgba(123,0,153,0.12)", "rgba(0,5,13,0.35)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Compte iVOD */}
      <View style={styles.accountBlock}>
        <View style={styles.accountRing}>
          <LinearGradient
            colors={isPremium ? [colors.gold, colors.magenta] : [...gradients.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accountRingGrad}
          >
            <View style={styles.accountAvatar}>
              <Text style={styles.accountInitial}>{initial}</Text>
            </View>
          </LinearGradient>
        </View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountKicker}>Compte iVOD</Text>
          <Text style={styles.accountName} numberOfLines={1}>
            {displayName}
          </Text>
          {email ? (
            <Text style={styles.accountEmail} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          <View style={[styles.planBadge, isPremium && styles.planBadgePremium]}>
            {isPremium ? <Crown color={colors.gold} size={11} /> : null}
            <Text style={[styles.planBadgeText, isPremium && styles.planBadgeTextPremium]}>
              {planLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Profil de lecture */}
      <TouchableOpacity
        style={styles.profileRow}
        activeOpacity={0.88}
        onPress={() => router.push("/(profiles)/select?mode=switch")}
        accessibilityRole="button"
        accessibilityLabel="Changer de profil de lecture"
      >
        {activeProfile ? (
          <ProfileAvatar
            name={activeProfile.name}
            avatarUrl={activeProfile.avatarUrl}
            size={52}
            isActive
            isKids={activeProfile.isKids}
            hasPin={activeProfile.hasPin}
            variant="rect"
          />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Users color={colors.magenta} size={24} />
          </View>
        )}
        <View style={styles.profileCopy}>
          <Text style={styles.profileKicker}>Profil de lecture</Text>
          <Text style={styles.profileName} numberOfLines={1}>
            {activeProfile?.name ?? "Sélectionner un profil"}
          </Text>
          <Text style={styles.profileHint}>
            {profileCount && profileCount > 1
              ? `${profileCount} profils · Appui long pour modifier`
              : "Recommandations et historique personnalisés"}
          </Text>
        </View>
        <View style={styles.profileCta}>
          <Text style={styles.profileCtaText}>Changer</Text>
          <ChevronRight color={colors.magenta} size={18} />
        </View>
      </TouchableOpacity>
    </PremiumPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: layout.pagePaddingX,
    marginBottom: 20,
    padding: 18,
    overflow: "hidden",
    gap: 0,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  accountBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 16,
  },
  accountRing: {},
  accountRingGrad: {
    width: 72,
    height: 72,
    borderRadius: 0,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatar: {
    width: 66,
    height: 66,
    borderRadius: 0,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  accountInitial: { fontSize: 26, fontWeight: "800", color: colors.foreground },
  accountCopy: { flex: 1, minWidth: 0, gap: 2 },
  accountKicker: {
    ...typography.kicker,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  accountName: { ...typography.h2, fontSize: 19 },
  accountEmail: { ...typography.caption, color: colors.muted },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.14)",
  },
  planBadgePremium: {
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.1)",
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.magenta,
  },
  planBadgeTextPremium: { color: colors.gold },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profilePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(123,0,153,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCopy: { flex: 1, minWidth: 0, gap: 2 },
  profileKicker: {
    ...typography.kicker,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.magenta,
  },
  profileName: { ...typography.h3, fontSize: 16 },
  profileHint: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  profileCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  profileCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.magenta,
  },
});
