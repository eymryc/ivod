import { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet, Alert, TextInput } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react-native";
import { usersApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { toast } from "@/presentation/utils/toast";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function PrivacyScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [emailMarketing, setEmailMarketing] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState("");

  const { data: prefs } = useQuery({
    queryKey: ["prefs"],
    queryFn: () => usersApi.getPreferences(),
  });

  useEffect(() => {
    if (prefs) {
      setEmailMarketing(prefs.emailMarketing);
      setEmailNotifications(prefs.emailNotifications);
    }
  }, [prefs]);

  const savePrefs = useMutation({
    mutationFn: () => usersApi.updatePreferences({ emailMarketing, emailNotifications }),
    onSuccess: () => toast.success("Préférences enregistrées."),
    onError: (e: Error) => toast.error(e.message),
  });

  const exportData = useMutation({
    mutationFn: () => usersApi.requestDataExport(),
    onSuccess: (d) =>
      toast.info((d as { message?: string }).message ?? "Demande d'export envoyée."),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: async () => {
      await logout();
      toast.success("Compte supprimé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsPage title="Confidentialité" description="RGPD, emails et suppression de compte." icon={Lock}>
      <View style={styles.row}>
        <Text style={styles.label}>Emails marketing</Text>
        <Switch value={emailMarketing} onValueChange={setEmailMarketing} trackColor={{ true: colors.magenta }} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Notifications email</Text>
        <Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ true: colors.magenta }} />
      </View>
      <Button title="Enregistrer les préférences" onPress={() => savePrefs.mutate()} />
      <Button title="Exporter mes données" variant="secondary" onPress={() => exportData.mutate()} />
      <Text style={styles.danger}>Supprimer le compte</Text>
      <Text style={styles.hint}>Tapez SUPPRIMER pour confirmer</Text>
      <TextInput
        style={styles.input}
        value={confirmDelete}
        onChangeText={setConfirmDelete}
        placeholder="SUPPRIMER"
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
      />
      <Button
        title="Supprimer définitivement"
        variant="danger"
        onPress={() => {
          if (confirmDelete !== "SUPPRIMER") {
            toast.warning('Tapez exactement "SUPPRIMER".');
            return;
          }
          Alert.alert("Dernier avertissement", "Action irréversible.", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: () => deleteAccount.mutate() },
          ]);
        }}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  label: { ...typography.body },
  danger: { ...typography.h3, color: colors.error, marginTop: 24 },
  hint: { ...typography.caption, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.foreground,
    backgroundColor: "rgba(0,0,0,0.25)",
    marginVertical: 8,
  },
});
