import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/infrastructure/api";
import { colors } from "@/theme/colors";

const REASONS = [
  { code: "INAPPROPRIATE", label: "Contenu inapproprié" },
  { code: "SPAM", label: "Spam" },
  { code: "COPYRIGHT", label: "Droits d'auteur" },
  { code: "MISINFORMATION", label: "Désinformation" },
  { code: "OTHER", label: "Autre" },
] as const;

interface Props {
  contentId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportModal({ contentId, visible, onClose }: Props) {
  const [reason, setReason] = useState<string>("INAPPROPRIATE");
  const [description, setDescription] = useState("");

  const submit = useMutation({
    mutationFn: () => reportsApi.reportContent(contentId, reason, description.trim() || undefined),
    onSuccess: () => {
      Alert.alert("Merci", "Votre signalement a été envoyé.");
      onClose();
      setDescription("");
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Signaler ce contenu</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.code}
              style={[styles.reason, reason === r.code && styles.reasonActive]}
              onPress={() => setReason(r.code)}
            >
              <Text style={styles.reasonText}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.input}
            placeholder="Détails (optionnel)"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.send}
              onPress={() => submit.mutate()}
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { backgroundColor: colors.backgroundElevated, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
  reason: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonActive: { borderColor: colors.magenta, backgroundColor: "rgba(230,0,126,0.1)" },
  reasonText: { color: colors.foreground, fontSize: 14 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancel: { flex: 1, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  cancelText: { color: colors.muted, fontWeight: "600" },
  send: { flex: 1, padding: 14, backgroundColor: colors.magenta, alignItems: "center" },
  sendText: { color: "#fff", fontWeight: "700" },
});
