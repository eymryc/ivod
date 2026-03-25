import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setStep('otp');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; user: any }>('/auth/verify-otp', { email, otp });
      if (data) {
        await setAuth(data.user, data.accessToken);
        router.replace('/(tabs)');
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Code invalide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoPlay}>▶</Text>
          </View>
          <Text style={styles.logoText}>iVOD</Text>
        </View>

        <Text style={styles.title}>
          {step === 'email' ? 'Connexion' : 'Vérification'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Entrez votre email pour recevoir un code'
            : `Code envoyé à ${email}`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="konan@example.ci"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.btn, (!email || loading) && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={!email || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Continuer →</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor="#6B7280"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, (otp.length !== 6 || loading) && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Confirmer</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setStep('email'); setOtp(''); }}
            >
              <Text style={styles.backBtnText}>← Modifier l'email</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#111118' },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4B44C8', justifyContent: 'center', alignItems: 'center' },
  logoPlay:    { color: '#fff', fontSize: 18 },
  logoText:    { fontSize: 26, fontWeight: '800', color: '#fff' },
  title:       { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subtitle:    { fontSize: 14, color: '#9CA3AF', marginBottom: 28 },
  input:       { backgroundColor: '#1A1A26', borderWidth: 1, borderColor: '#2A2A3E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#fff', marginBottom: 16 },
  otpInput:    { textAlign: 'center', fontSize: 24, letterSpacing: 12 },
  btn:         { backgroundColor: '#4B44C8', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn:     { marginTop: 16, alignItems: 'center' },
  backBtnText: { color: '#9CA3AF', fontSize: 14 },
});
