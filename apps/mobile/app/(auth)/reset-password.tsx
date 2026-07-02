import { useState } from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { getErrorMessage as formatApiErrorMessage } from "@/core/errors";
import { authApi } from "@/infrastructure/api";
import { toast } from "@/presentation/utils/toast";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function ResetPasswordScreen() {
  const { email: emailParam, token: tokenParam } = useLocalSearchParams<{
    email?: string;
    token?: string;
  }>();
  const router = useRouter();
  const [email, setEmail] = useState(emailParam ?? "");
  const [token, setToken] = useState(tokenParam ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !token.trim() || password.length < 8) {
      toast.warning("Email, code et mot de passe (8 caractères minimum) requis.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword: password,
      });
      toast.success("Mot de passe mis à jour.");
      router.replace("/(auth)/login");
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Saisissez le code reçu par email">
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Input label="Code reçu par email" value={token} onChangeText={setToken} />
      <Input
        label="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Réinitialiser" onPress={submit} loading={loading} />
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.linkWrap}>
          <Text style={styles.back}>← Retour à la connexion</Text>
        </TouchableOpacity>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  linkWrap: { marginTop: 16, alignItems: "center" },
  back: { ...typography.bodyMuted },
});
