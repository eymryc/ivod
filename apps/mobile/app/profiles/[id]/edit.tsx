import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/infrastructure/api";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { PremiumPanel } from "@/components/layout/PremiumPanel";
import { AccentLine } from "@/components/layout/AccentLine";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function EditProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [isKids, setIsKids] = useState(false);
  const [pin, setPin] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => profilesApi.list() as Promise<Array<{ id: string; name: string; isKids?: boolean }>>,
  });

  useEffect(() => {
    const p = profiles.find((x: { id: string }) => x.id === id);
    if (p) {
      setName(p.name);
      setIsKids(!!p.isKids);
    }
  }, [profiles, id]);

  const update = useMutation({
    mutationFn: () =>
      profilesApi.update(id!, {
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

  const remove = useMutation({
    mutationFn: () => profilesApi.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      router.replace("/(profiles)/select");
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  return (
    <PageCanvas>
      <View style={styles.container}>
        <Text style={styles.title}>Modifier le profil</Text>
        <AccentLine width={48} style={{ marginVertical: 12 }} />

        <PremiumPanel style={styles.panel}>
          <Input label="Nom du profil" value={name} onChangeText={setName} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Profil enfant</Text>
              <Text style={styles.hint}>Filtre le contenu selon l'âge.</Text>
            </View>
            <Switch value={isKids} onValueChange={setIsKids} trackColor={{ true: colors.magenta }} />
          </View>
          <Input
            label="Nouveau PIN (optionnel)"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="Laisser vide pour conserver"
          />
          <Button title="Enregistrer" onPress={() => update.mutate()} loading={update.isPending} />
          <Button
            title="Supprimer ce profil"
            variant="danger"
            onPress={() =>
              Alert.alert("Supprimer", "Confirmer la suppression de ce profil ?", [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => remove.mutate() },
              ])
            }
          />
        </PremiumPanel>
      </View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: layout.pagePaddingX, paddingTop: 8 },
  title: { ...typography.h1 },
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
