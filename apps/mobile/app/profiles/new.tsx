import { useState } from "react";
import { View, Text, StyleSheet, Alert, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/infrastructure/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";

export default function NewProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
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
    <View style={styles.container}>
      <Text style={styles.title}>Nouveau profil</Text>
      <Input label="Nom" value={name} onChangeText={setName} />
      <View style={styles.row}>
        <Text style={styles.label}>Profil enfant</Text>
        <Switch value={isKids} onValueChange={setIsKids} trackColor={{ true: colors.magenta }} />
      </View>
      <Input label="PIN (optionnel, 4 chiffres)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Button
        title="Créer"
        onPress={() => {
          if (!name.trim()) return Alert.alert("Nom requis");
          create.mutate();
        }}
        loading={create.isPending}
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
