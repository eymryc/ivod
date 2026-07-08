import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Film, Users, Monitor } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { creatorApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { SettingsFormSection } from "@/components/settings/SettingsFormSection";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { toast } from "@/presentation/utils/toast";
import { assetUrl } from "@/utils/assets";
import { CREATOR_PROFILE_MEDIA_HINT } from "@/core/constants/creator-profile-media";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

const BIO_MAX = 2000;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default function CreatorProfileSettingsScreen() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [stageName, setStageName] = useState("");
  const [bio, setBio] = useState("");

  const { data: creator, isLoading, isError } = useQuery({
    queryKey: ["creator-me"],
    queryFn: () => creatorApi.getMe(),
  });

  useEffect(() => {
    if (!creator) return;
    setFirstName(creator.user?.firstName ?? user?.firstName ?? "");
    setLastName(creator.user?.lastName ?? user?.lastName ?? "");
    setPhone(creator.user?.phone ?? "");
    setStageName(creator.stageName ?? "");
    setBio(creator.bio ?? "");
  }, [creator, user]);

  const save = useMutation({
    mutationFn: () =>
      creatorApi.updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        stageName: stageName.trim(),
        bio: bio.trim() || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["creator-me"] });
      if (user) {
        setUser({
          ...user,
          firstName: data.user?.firstName ?? firstName.trim(),
          lastName: data.user?.lastName ?? lastName.trim(),
          phone: data.user?.phone ?? (phone.trim() || null),
          name: `${data.user?.firstName ?? firstName} ${data.user?.lastName ?? lastName}`.trim(),
        });
      }
      toast.success("Profil mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <SettingsPage title="Profil créateur">
        <ActivityIndicator color={colors.magenta} style={{ marginTop: 24 }} />
      </SettingsPage>
    );
  }

  if (isError || !creator) {
    return (
      <SettingsPage title="Profil créateur">
        <Text style={styles.muted}>Aucun profil créateur associé à ce compte.</Text>
      </SettingsPage>
    );
  }

  const avatarUri = assetUrl(creator.avatarObjectKey);
  const previewInitial = (stageName || "?").charAt(0).toUpperCase();
  const contentCount = creator._count?.contents ?? 0;
  const subscribers = creator.subscriberCount ?? 0;

  return (
    <SettingsPage
      title="Profil créateur"
      description="Aperçu de votre page publique et informations de compte."
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PremiumPanel variant="hero" style={styles.hero}>
          <LinearGradient
            colors={[...gradients.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroAccent}
          />
          <Text style={styles.previewLabel}>APERÇU PUBLIC</Text>

          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={["rgba(123,0,153,0.55)", "rgba(230,0,126,0.45)"]}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarLetter}>{previewInitial}</Text>
              </LinearGradient>
            )}
            {creator.verified ? (
              <View style={styles.verifiedDot}>
                <BadgeCheck color="#fff" size={14} />
              </View>
            ) : null}
          </View>

          <Text style={styles.stageName} numberOfLines={2}>
            {stageName.trim() || "Nom de scène"}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {creator.user?.email}
          </Text>

          <Text style={styles.bioPreview} numberOfLines={3}>
            {bio.trim() || "Ajoutez une biographie pour présenter votre studio."}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Users color={colors.magenta} size={14} />
              <Text style={styles.statText}>{formatCount(subscribers)} abonnés</Text>
            </View>
            <View style={styles.stat}>
              <Film color={colors.magenta} size={14} />
              <Text style={styles.statText}>{formatCount(contentCount)} contenus</Text>
            </View>
          </View>
        </PremiumPanel>

        <SettingsFormSection
          kicker="Compte"
          title="Identité légale"
          description="Utilisée pour la facturation et l'administration."
        >
          <View style={styles.row2}>
            <View style={styles.col}>
              <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.col}>
              <Input label="Nom" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+225..."
          />
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyLabel}>Email</Text>
            <Text style={styles.readonlyValue}>{creator.user?.email}</Text>
          </View>
        </SettingsFormSection>

        <SettingsFormSection
          kicker="Studio"
          title="Profil public"
          description="Visible sur votre page créateur et l'accueil iVOD."
        >
          <Input label="Nom de scène" value={stageName} onChangeText={setStageName} />
          <View>
            <Input
              label="Biographie"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={5}
              style={styles.bioInput}
              maxLength={BIO_MAX}
            />
            <Text style={styles.charCount}>
              {bio.length} / {BIO_MAX}
            </Text>
          </View>
        </SettingsFormSection>

        <PremiumPanel style={styles.webHint}>
          <Monitor color={colors.magenta} size={18} />
          <View style={styles.webHintText}>
            <Text style={styles.webHintTitle}>Avatar & bannière</Text>
            <Text style={styles.webHintBody}>{CREATOR_PROFILE_MEDIA_HINT}</Text>
          </View>
        </PremiumPanel>

        <Button
          title="Enregistrer les modifications"
          onPress={() => save.mutate()}
          loading={save.isPending}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24, gap: 4 },
  muted: { ...typography.bodyMuted },
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 8,
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  previewLabel: {
    ...typography.kicker,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 16,
    color: colors.muted,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.foreground,
  },
  verifiedDot: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0ea5e9",
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stageName: {
    ...typography.h2,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  email: {
    ...typography.caption,
    marginTop: 4,
    marginBottom: 10,
    textAlign: "center",
  },
  bioPreview: {
    ...typography.bodyMuted,
    textAlign: "center",
    paddingHorizontal: 8,
    minHeight: 48,
    fontStyle: "italic",
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
    justifyContent: "center",
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { ...typography.caption, color: colors.muted },
  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  readonlyField: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyLabel: { ...typography.caption, marginBottom: 4 },
  readonlyValue: { ...typography.body, color: colors.muted },
  bioInput: { minHeight: 120, textAlignVertical: "top" },
  charCount: {
    ...typography.caption,
    textAlign: "right",
    marginTop: 4,
    color: colors.muted,
  },
  webHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    marginBottom: 8,
  },
  webHintText: { flex: 1 },
  webHintTitle: { ...typography.body, fontWeight: "600", marginBottom: 4 },
  webHintBody: { ...typography.caption, lineHeight: 18 },
  saveBtn: { marginTop: 4 },
});
