import { useState } from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { useRouter, Link } from "expo-router";
import { getErrorMessage as formatApiErrorMessage } from "@/core/errors";
import { authApi } from "@/infrastructure/api";
import { toast } from "@/presentation/utils/toast";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      toast.success("Consultez votre boîte mail pour réinitialiser le mot de passe.", "Email envoyé");
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien de réinitialisation par email"
    >
      <Input
        label="Email du compte"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button
        title={sent ? "Renvoyer" : "Envoyer le lien"}
        onPress={handleSubmit}
        loading={loading}
        style={styles.btn}
      />
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(auth)/reset-password", params: { email } })}
        style={styles.linkWrap}
      >
        <Text style={styles.link}>J&apos;ai déjà un code de réinitialisation</Text>
      </TouchableOpacity>
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.linkWrap}>
          <Text style={styles.back}>← Retour à la connexion</Text>
        </TouchableOpacity>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 8 },
  linkWrap: { marginTop: 16, alignItems: "center" },
  link: { color: colors.magenta, fontSize: 14, fontWeight: "600", textAlign: "center" },
  back: { ...typography.bodyMuted },
});
