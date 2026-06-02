import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { profilesApi } from "@/infrastructure/api";
import { colors } from "@/theme/colors";

interface Props {
  profileId: string;
  visible: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

export function ParentalPinModal({ profileId, visible, onVerified, onCancel }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    try {
      await profilesApi.verifyPin(profileId, pin);
      setPin("");
      onVerified();
    } catch (e) {
      Alert.alert("PIN incorrect", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Contrôle parental</Text>
          <Text style={styles.sub}>Entrez le PIN du profil pour continuer.</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="PIN"
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            style={[styles.btn, (!pin || loading) && styles.btnDisabled]}
            disabled={!pin || loading}
            onPress={verify}
          >
            <Text style={styles.btnText}>Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: colors.surface, padding: 24, gap: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 13, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 20,
    color: colors.foreground,
    textAlign: "center",
    letterSpacing: 8,
  },
  btn: { backgroundColor: colors.magenta, padding: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700" },
  cancel: { textAlign: "center", color: colors.muted, marginTop: 8 },
});
