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
import { Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { profilesApi } from "@/infrastructure/api";
import { useProfileStore, type Profile } from "@/store/profile.store";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { BackButton } from "@/components/layout/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AccentLine } from "@/components/layout/AccentLine";
import { GradientText } from "@/components/layout/GradientText";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { toast } from "@/presentation/utils/toast";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const CARD_WIDTH = 148;

export default function ProfileSelectScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSwitchMode = mode === "switch";

  const qc = useQueryClient();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const { setProfiles, setActiveProfile } = useProfileStore();
  const [pinModal, setPinModal] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");

  const { data: profiles = [], isLoading, isError } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => profilesApi.list() as Promise<Profile[]>,
  });

  useEffect(() => {
    if (!profiles.length) return;
    setProfiles(profiles);

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
      router.replace("/(tabs)/profil");
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
          <ActivityIndicator color={colors.magenta} size={40} />
          <Text style={styles.loadingText}>Chargement des profils…</Text>
        </View>
      </PageCanvas>
    );
  }

  if (isError || profiles.length === 0) {
    return (
      <PageCanvas>
        <View style={styles.centered}>
          {isSwitchMode ? (
            <BackButton label="Retour au profil" onPress={() => router.replace("/(tabs)/profil")} />
          ) : null}
          <Text style={styles.sub}>
            {isError
              ? "Impossible de charger vos profils. Reconnectez-vous pour continuer."
              : "Aucun profil disponible."}
          </Text>
          <Button
            title="Se connecter"
            onPress={() => router.replace("/(auth)/login")}
            style={{ marginTop: 16 }}
          />
        </View>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackButton
          label={isSwitchMode ? "Retour au profil" : "Retour"}
          onPress={() =>
            isSwitchMode ? router.replace("/(tabs)/profil") : router.back()
          }
        />

        <View style={styles.header}>
          {!isSwitchMode ? <BrandLogo size="lg" /> : null}
          {!isSwitchMode ? <AccentLine width={48} style={{ marginVertical: 16 }} /> : null}
          {isSwitchMode ? (
            <GradientText style={styles.kicker}>PROFIL DE LECTURE</GradientText>
          ) : null}
          {isSwitchMode ? <AccentLine width={40} style={{ marginVertical: 10 }} /> : null}
          <Text style={styles.title}>
            {isSwitchMode ? "Changer de profil" : "Qui regarde ?"}
          </Text>
          <Text style={styles.sub}>
            {isSwitchMode
              ? "Choisissez qui utilise l'application. Appui long sur un profil pour le modifier."
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
                activeOpacity={0.9}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["rgba(230,0,126,0.18)", "rgba(0,5,13,0.5)"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : null}
                <ProfileAvatar
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  size={80}
                  isActive={isActive}
                  isKids={p.isKids}
                  hasPin={p.hasPin}
                  showCheck={isActive}
                  variant={isSwitchMode ? "rect" : "circle"}
                  forceInitial={isSwitchMode}
                />
                <Text style={[styles.name, isActive && styles.nameActive]} numberOfLines={1}>
                  {p.name}
                </Text>
                {isActive ? <Text style={styles.activeBadge}>Profil actif</Text> : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/profiles/new")}
            activeOpacity={0.9}
          >
            <View style={styles.addRing}>
              <Plus color={colors.magenta} size={32} strokeWidth={2} />
            </View>
            <Text style={styles.name}>Ajouter</Text>
            <Text style={styles.addHint}>Nouveau profil</Text>
          </TouchableOpacity>
        </View>

        {isSwitchMode ? (
          <Button
            title="Retour au profil"
            variant="secondary"
            onPress={() => router.replace("/(tabs)/profil")}
            style={styles.backBtn}
          />
        ) : null}
      </ScrollView>

      {pinModal ? (
        <View style={styles.pinOverlay}>
          <PremiumPanel style={styles.pinBox}>
            <LinearGradient
              colors={[...gradients.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pinAccent}
            />
            <ProfileAvatar name={pinModal.name} avatarUrl={pinModal.avatarUrl} size={64} />
            <Text style={styles.pinTitle}>Code PIN</Text>
            <Text style={styles.pinSub}>{pinModal.name}</Text>
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
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
    alignItems: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    paddingHorizontal: layout.pagePaddingX,
  },
  loadingText: { ...typography.caption, marginTop: 12, color: colors.muted },
  header: {
    width: "100%",
    paddingHorizontal: layout.pagePaddingX,
    paddingTop: 4,
    paddingBottom: 20,
    alignItems: "center",
  },
  kicker: { fontSize: 10, letterSpacing: 2.4, marginBottom: 2 },
  title: { ...typography.h2, fontSize: 26, textAlign: "center" },
  sub: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
    lineHeight: 21,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: layout.pagePaddingX,
    gap: 14,
    justifyContent: "center",
    maxWidth: 360,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.55)",
    overflow: "hidden",
  },
  cardActive: {
    borderColor: "rgba(230,0,126,0.45)",
    backgroundColor: "rgba(123,0,153,0.1)",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    maxWidth: "100%",
    textAlign: "center",
  },
  nameActive: { color: colors.magenta },
  activeBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.magenta,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  addRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(230,0,126,0.4)",
    backgroundColor: "rgba(123,0,153,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  addHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: -4,
  },
  backBtn: {
    marginHorizontal: layout.pagePaddingX,
    marginTop: 24,
    alignSelf: "stretch",
    maxWidth: 360,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pinBox: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  pinAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  pinTitle: { ...typography.h3, marginTop: 4 },
  pinSub: { ...typography.caption, color: colors.muted, marginBottom: 4 },
  pinInput: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 12,
    color: colors.foreground,
    backgroundColor: colors.surface,
    marginBottom: 4,
  },
});
