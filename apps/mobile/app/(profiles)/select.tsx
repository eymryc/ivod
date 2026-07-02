import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateProfileScopedQueries } from "@/core/constants/invalidate-profile-queries";
import { Plus, Check } from "lucide-react-native";
import { profilesApi } from "@/infrastructure/api";
import { useProfileStore, type Profile } from "@/store/profile.store";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { BackButton } from "@/components/layout/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AccentLine } from "@/components/layout/AccentLine";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { Button } from "@/components/ui/Button";
import { toast } from "@/presentation/utils/toast";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function ProfileSelectScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSwitchMode = mode === "switch";

  const qc = useQueryClient();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const { setProfiles, setActiveProfile } = useProfileStore();
  const [pinModal, setPinModal] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => profilesApi.list() as Promise<Profile[]>,
  });

  useEffect(() => {
    if (!profiles.length) return;
    setProfiles(profiles);

    // Redirection auto uniquement à la première connexion (pas « Changer de profil »)
    if (isSwitchMode || activeProfileId) return;
    if (profiles.length === 1 && !profiles[0].hasPin) {
      setActiveProfile(profiles[0].id).then(() => router.replace("/(tabs)"));
    }
  }, [profiles, isSwitchMode, activeProfileId]);

  async function finishSelection(p: Profile) {
    await setActiveProfile(p.id);
    await invalidateProfileScopedQueries(qc);
    if (isSwitchMode) {
      toast.success(`Profil « ${p.name} » activé.`);
      router.back();
      return;
    }
    router.replace("/(tabs)");
  }

  async function selectProfile(p: Profile) {
    if (p.hasPin) {
      setPinModal(p);
      setPin("");
      return;
    }
    await finishSelection(p);
  }

  async function verifyPin() {
    if (!pinModal) return;
    try {
      await profilesApi.verifyPin(pinModal.id, pin);
      setPinModal(null);
      setPin("");
      await finishSelection(pinModal);
    } catch {
      toast.error("Code PIN incorrect. Réessayez.");
    }
  }

  if (isLoading) {
    return (
      <PageCanvas>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} size="large" />
        </View>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isSwitchMode ? <BackButton /> : null}

        <View style={styles.header}>
          {!isSwitchMode ? <BrandLogo size="lg" /> : null}
          {!isSwitchMode ? <AccentLine width={48} style={{ marginVertical: 16 }} /> : null}
          <Text style={styles.title}>
            {isSwitchMode ? "Changer de profil" : "Qui regarde ?"}
          </Text>
          <Text style={styles.sub}>
            {isSwitchMode
              ? "Sélectionnez le profil à utiliser sur cet appareil."
              : "Choisissez un profil pour personnaliser vos recommandations."}
          </Text>
        </View>

        <View style={styles.grid}>
          {profiles.map((p: Profile) => {
            const isActive = activeProfileId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => selectProfile(p)}
                onLongPress={() => router.push(`/profiles/${p.id}/edit`)}
                activeOpacity={0.85}
              >
                <View style={[styles.avatar, p.isKids && styles.avatarKids, isActive && styles.avatarActive]}>
                  {isActive ? (
                    <Check color={colors.foreground} size={28} strokeWidth={2.5} />
                  ) : (
                    <Text style={styles.avatarLetter}>{p.name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={[styles.name, isActive && styles.nameActive]}>{p.name}</Text>
                {p.isKids ? <Text style={styles.kids}>Enfant</Text> : null}
                {p.hasPin ? <Text style={styles.pinHint}>PIN</Text> : null}
                {isActive ? <Text style={styles.activeBadge}>Actif</Text> : null}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.card} onPress={() => router.push("/profiles/new")}>
            <View style={[styles.avatar, styles.avatarAdd]}>
              <Plus color={colors.muted} size={28} />
            </View>
            <Text style={styles.name}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {isSwitchMode ? (
          <Button title="Retour" variant="secondary" onPress={() => router.back()} style={styles.cancelBtn} />
        ) : null}
      </ScrollView>

      {pinModal ? (
        <View style={styles.pinOverlay}>
          <PremiumPanel style={styles.pinBox}>
            <Text style={styles.pinTitle}>Code PIN — {pinModal.name}</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <Button title="Valider" onPress={verifyPin} />
            <Button
              title="Annuler"
              variant="secondary"
              onPress={() => {
                setPinModal(null);
                setPin("");
              }}
            />
          </PremiumPanel>
        </View>
      ) : null}
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 32, justifyContent: "center", alignItems: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 280 },
  header: {
    width: "100%",
    paddingHorizontal: layout.pagePaddingX,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  title: { ...typography.h2, fontSize: 24, textAlign: "center" },
  sub: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: layout.pagePaddingX,
    gap: 16,
    justifyContent: "center",
  },
  card: { width: 120, alignItems: "center", gap: 6 },
  cardActive: { opacity: 1 },
  avatar: {
    width: 88,
    height: 88,
    backgroundColor: "rgba(230,0,126,0.15)",
    borderWidth: 2,
    borderColor: "rgba(230,0,126,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    borderColor: colors.magenta,
    backgroundColor: "rgba(230,0,126,0.28)",
  },
  avatarKids: { borderColor: "rgba(255,179,0,0.5)", backgroundColor: "rgba(255,179,0,0.1)" },
  avatarAdd: { borderStyle: "dashed", borderColor: colors.borderStrong },
  avatarLetter: { fontSize: 32, fontWeight: "800", color: colors.foreground },
  name: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  nameActive: { color: colors.magenta },
  kids: { fontSize: 10, color: colors.gold, fontWeight: "700" },
  pinHint: { fontSize: 10, color: colors.muted },
  activeBadge: {
    fontSize: 10,
    color: colors.magenta,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  cancelBtn: { marginHorizontal: layout.pagePaddingX, marginTop: 8 },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pinBox: { width: "100%", maxWidth: 320 },
  pinTitle: { ...typography.h3, textAlign: "center", marginBottom: 8 },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 12,
    color: colors.foreground,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
});
