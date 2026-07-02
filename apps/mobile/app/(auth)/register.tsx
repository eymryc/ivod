import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter, Link } from "expo-router";
import { getErrorMessage as formatApiErrorMessage } from "@/core/errors";
import { authApi } from "@/infrastructure/api";
import { toast } from "@/presentation/utils/toast";
import { useAuthStore } from "@/store/auth.store";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const data = await authApi.register({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });
      await setAuth(data.user as never, data.accessToken, data.refreshToken);
      toast.success("Bienvenue sur iVOD");
      router.replace("/(profiles)/select");
    } catch (e) {
      toast.error(formatApiErrorMessage(e), "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Rejoignez iVOD en quelques secondes">
      <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
      <Input label="Nom" value={lastName} onChangeText={setLastName} />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Créer mon compte" onPress={handleRegister} loading={loading} />
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>
            Déjà inscrit ? <Text style={styles.linkAccent}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: 20, alignItems: "center" },
  linkText: { ...typography.bodyMuted },
  linkAccent: { color: colors.magenta, fontWeight: "600" },
});
