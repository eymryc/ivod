import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Baby } from "lucide-react-native";
import { profilesApi } from "@/infrastructure/api";
import { useProfileStore } from "@/store/profile.store";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { FilterPill } from "@/components/layout/FilterPill";
import { toast } from "@/presentation/utils/toast";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

const MATURITY = [
  { code: "ALL", label: "Tous publics" },
  { code: "-12", label: "-12 ans" },
  { code: "-16", label: "-16 ans" },
  { code: "-18", label: "-18 ans" },
];

export default function ParentalScreen() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeId = useProfileStore((s) => s.activeProfileId);
  const [profileId, setProfileId] = useState(activeId ?? profiles[0]?.id ?? "");
  const [maxMaturity, setMaxMaturity] = useState("ALL");
  const [pin, setPin] = useState("");
  const qc = useQueryClient();

  const { data: control } = useQuery({
    queryKey: ["parental", profileId],
    queryFn: () => profilesApi.getParentalControl(profileId),
    enabled: !!profileId,
  });

  useEffect(() => {
    const c = control as { maxMaturityRatingCode?: string } | undefined;
    if (c?.maxMaturityRatingCode) setMaxMaturity(c.maxMaturityRatingCode);
  }, [control]);

  const save = useMutation({
    mutationFn: () =>
      profilesApi.upsertParentalControl(profileId, {
        maxMaturityRatingCode: maxMaturity,
        requirePin: pin.length >= 4,
        pin: pin || undefined,
      }),
    onSuccess: () => {
      toast.success("Contrôle parental enregistré.");
      qc.invalidateQueries({ queryKey: ["parental", profileId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsPage title="Contrôle parental" description="Restrictions par profil." icon={Baby}>
      <Text style={styles.label}>Profil</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {profiles.map((p) => (
          <FilterPill
            key={p.id}
            label={p.name}
            active={profileId === p.id}
            onPress={() => setProfileId(p.id)}
          />
        ))}
      </ScrollView>
      <Text style={[styles.label, { marginTop: 16 }]}>Âge maximum</Text>
      <View style={styles.options}>
        {MATURITY.map((m) => (
          <TouchableOpacity
            key={m.code}
            style={[styles.option, maxMaturity === m.code && styles.optionActive]}
            onPress={() => setMaxMaturity(m.code)}
          >
            <Text style={styles.optionText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="PIN parental (4 chiffres)"
        placeholderTextColor={colors.muted}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
      />
      <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, marginBottom: 8 },
  chips: { gap: 8, paddingBottom: 8 },
  options: { gap: 8, marginBottom: 8 },
  option: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  optionActive: { borderColor: colors.magenta, backgroundColor: "rgba(230,0,126,0.1)" },
  optionText: { ...typography.body },
  input: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.foreground,
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
