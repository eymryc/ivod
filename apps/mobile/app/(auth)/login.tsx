import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import { getErrorMessage as formatApiErrorMessage } from "@/core/errors";
import { authApi } from "@/infrastructure/api";
import { toast } from "@/presentation/utils/toast";
import { useAuthStore } from "@/store/auth.store";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
type Mode = "password" | "otp";
type OtpStep = "email" | "code";

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>("password");
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      await setAuth(data.user as never, data.accessToken, data.refreshToken);
      router.replace("/(profiles)/select");
    } catch (e) {
      console.error("[Login] Erreur:", e);
      toast.error(formatApiErrorMessage(e), "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.sendOtp(email.trim());
      setOtpStep("code");
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(email.trim(), otp);
      await setAuth(data.user as never, data.accessToken, data.refreshToken);
      router.replace("/(profiles)/select");
    } catch (e) {
      toast.error(formatApiErrorMessage(e), "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre compte iVOD">
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === "password" && styles.tabActive]}
          onPress={() => setMode("password")}
        >
          <Text style={[styles.tabText, mode === "password" && styles.tabTextActive]}>
            Mot de passe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === "otp" && styles.tabActive]}
          onPress={() => {
            setMode("otp");
            setOtpStep("email");
          }}
        >
          <Text style={[styles.tabText, mode === "otp" && styles.tabTextActive]}>Code email</Text>
        </TouchableOpacity>
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="vous@exemple.ci"
      />

      {mode === "password" ? (
        <>
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Button title="Se connecter" onPress={handlePasswordLogin} loading={loading} />
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </Link>
        </>
      ) : otpStep === "email" ? (
        <Button title="Recevoir un code" onPress={handleSendOtp} loading={loading} />
      ) : (
        <>
          <Input
            label="Code à 6 chiffres"
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            style={styles.otp}
          />
          <Button
            title="Valider"
            onPress={handleVerifyOtp}
            loading={loading}
            disabled={otp.length !== 6}
          />
          <TouchableOpacity onPress={() => setOtpStep("email")} style={styles.link}>
            <Text style={styles.linkText}>← Modifier l&apos;email</Text>
          </TouchableOpacity>
        </>
      )}

      <Link href="/(auth)/register" asChild>
        <TouchableOpacity style={[styles.link, { marginTop: 24 }]}>
          <Text style={styles.linkText}>
            Pas de compte ? <Text style={styles.linkAccent}>S&apos;inscrire</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.magenta, backgroundColor: "rgba(230,0,126,0.12)" },
  tabText: { ...typography.pill, color: colors.muted },
  tabTextActive: { color: colors.magenta },
  otp: { textAlign: "center", letterSpacing: 8, fontSize: 22 },
  link: { marginTop: 14, alignItems: "center" },
  linkText: { ...typography.bodyMuted, textAlign: "center" },
  linkAccent: { color: colors.magenta, fontWeight: "600" },
});
