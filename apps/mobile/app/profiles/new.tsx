import { useState } from "react";
import { View, Text, StyleSheet, Alert, Switch, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/infrastructure/api";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { AccentLine } from "@/components/layout/AccentLine";
import { BackButton } from "@/components/layout/BackButton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NewProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [isKids, setIsKids] = useState(false);
  const [pin, setPin] = useState("");

  const create = useMutation({
    mutationFn: () =>
      profilesApi.create({
        name: name.trim(),
        isKids,
        ...(pin.length >= 4 ? { pin } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      router.back();
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  return (
    <PageCanvas>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max(8, insets.top + 8) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Retour" onPress={() => router.back()} />
        <Text style={styles.title}>Nouveau profil</Text>
        <AccentLine width={48} style={{ marginVertical: 12 }} />
        <Text style={styles.subtitle}>
          Créez un profil pour personnaliser recommandations et historique.
        </Text>

        <PremiumPanel style={styles.panel}>
          <Input
            label="Nom du profil"
            value={name}
            onChangeText={setName}
            placeholder="Ex. Aminata"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Profil enfant</Text>
              <Text style={styles.hint}>Filtre le contenu selon l'âge.</Text>
            </View>
            <Switch value={isKids} onValueChange={setIsKids} trackColor={{ true: colors.magenta }} />
          </View>
          <Input
            label="PIN (optionnel)"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="4 chiffres minimum"
          />
          <Button
            title="Créer le profil"
            onPress={() => {
              if (!name.trim()) return Alert.alert("Nom requis", "Choisissez un nom pour ce profil.");
              create.mutate();
            }}
            loading={create.isPending}
          />
        </PremiumPanel>
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: layout.pagePaddingX, paddingBottom: 24, gap: 4 },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted, marginBottom: 8 },
  panel: { gap: 16, marginTop: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  label: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
