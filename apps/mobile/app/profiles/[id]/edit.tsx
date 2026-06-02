import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/infrastructure/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";

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
    const p = profiles.find((x) => x.id === id);
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
    <View style={styles.container}>
      <Text style={styles.title}>Modifier le profil</Text>
      <Input label="Nom" value={name} onChangeText={setName} />
      <View style={styles.row}>
        <Text style={styles.label}>Profil enfant</Text>
        <Switch value={isKids} onValueChange={setIsKids} trackColor={{ true: colors.magenta }} />
      </View>
      <Input label="Nouveau PIN (optionnel)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Button title="Enregistrer" onPress={() => update.mutate()} loading={update.isPending} />
      <Button
        title="Supprimer ce profil"
        variant="danger"
        onPress={() =>
          Alert.alert("Supprimer", "Confirmer la suppression ?", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: () => remove.mutate() },
          ])
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.foreground, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  label: { color: colors.foreground, fontSize: 15 },
});
