import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Shield } from "lucide-react-native";
import { authApi } from "@/infrastructure/api";
import { ApiError } from '@/core/errors';
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { toast } from "@/presentation/utils/toast";

export default function SecurityScreen() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChange() {
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      toast.success("Mot de passe mis à jour.");
      setCurrent("");
      setNext("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Échec de la mise à jour.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsPage
      title="Sécurité"
      description="Modifiez votre mot de passe de connexion."
      icon={Shield}
    >
      <View style={styles.form}>
        <Input label="Mot de passe actuel" value={current} onChangeText={setCurrent} secureTextEntry />
        <Input label="Nouveau mot de passe" value={next} onChangeText={setNext} secureTextEntry />
        <Button title="Enregistrer" onPress={handleChange} loading={loading} style={styles.btn} />
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  btn: { marginTop: 8 },
});
