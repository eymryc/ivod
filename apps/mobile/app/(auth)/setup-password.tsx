import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getErrorMessage as formatApiErrorMessage } from "@/core/errors";
import { authApi } from "@/infrastructure/api";
import { toast } from "@/presentation/utils/toast";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";

export default function SetupPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .verifySetupToken(token)
      .then((r) => {
        setValid(r.valid);
        if (r.email) setEmail(r.email);
      })
      .catch(() => setValid(false));
  }, [token]);

  async function submit() {
    if (!token || password.length < 8) return;
    setLoading(true);
    try {
      await authApi.setupPassword({ token, newPassword: password });
      toast.success("Connectez-vous avec votre nouveau mot de passe.", "Compte activé");
      router.replace("/(auth)/login");
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <AuthShell title="Activation" subtitle="Vérification du lien…">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} size="large" />
        </View>
      </AuthShell>
    );
  }

  if (!valid || !token) {
    return (
      <AuthShell title="Lien invalide" subtitle="Ce lien d'activation a expiré ou n'est plus valide">
        <Text style={styles.err}>Demandez un nouvel email à votre administrateur.</Text>
        <Button title="Retour à la connexion" onPress={() => router.replace("/(auth)/login")} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Activer le compte" subtitle={email ? `Compte : ${email}` : undefined}>
      <Input label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Activer le compte" onPress={submit} loading={loading} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 32, alignItems: "center" },
  err: { color: colors.error, textAlign: "center", marginBottom: 16, lineHeight: 20 },
});
