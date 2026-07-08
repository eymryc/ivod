import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { usersApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { SettingsFormSection } from "@/components/settings/SettingsFormSection";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { toast } from "@/presentation/utils/toast";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function SettingsProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState("");

  const { data: me } = useQuery({
    queryKey: ["users-me"],
    queryFn: () => usersApi.me(),
    enabled: !!user,
  });

  useEffect(() => {
    const source = me ?? user;
    if (!source) return;
    setFirstName(source.firstName ?? "");
    setLastName(source.lastName ?? "");
    setPhone(source.phone ?? "");
  }, [me, user]);

  const save = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: (data) => {
      setUser({
        ...user!,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
      });
      toast.success("Informations mises à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || me?.email?.split("@")[0] || "Compte";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SettingsPage
      title="Informations personnelles"
      description="Votre identité sur iVOD."
      icon={User}
    >
      <PremiumPanel variant="hero" style={styles.hero}>
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.heroAccent}
        />
        <View style={styles.avatarRing}>
          <LinearGradient
            colors={[...gradients.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRingGrad}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{me?.email ?? user?.email}</Text>
      </PremiumPanel>

      <SettingsFormSection
        kicker="Identité"
        title="Coordonnées"
        description="Ces informations sont liées à votre compte iVOD."
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
          <Text style={styles.readonlyValue}>{me?.email ?? user?.email}</Text>
          <Text style={styles.readonlyHint}>La modification de l'email n'est pas encore disponible.</Text>
        </View>
      </SettingsFormSection>

      <Button
        title="Enregistrer"
        onPress={() => save.mutate()}
        loading={save.isPending}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingTop: 24,
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
  avatarRing: { marginBottom: 12 },
  avatarRingGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
  },
  name: { ...typography.h2, textAlign: "center" },
  email: { ...typography.caption, marginTop: 4, textAlign: "center" },
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
  readonlyHint: { ...typography.caption, marginTop: 6, fontStyle: "italic" },
});
