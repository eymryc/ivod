import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Baby } from "lucide-react-native";
import { profilesApi, referencesApi } from "@/infrastructure/api";
import { useProfileStore } from "@/store/profile.store";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { FilterPill } from "@/components/layout/FilterPill";
import { toast } from "@/presentation/utils/toast";
import { resolveMaxMaturityCode } from "@/presentation/utils/parental";
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
  const [blockedGenres, setBlockedGenres] = useState<string[]>([]);
  const [hoursEnabled, setHoursEnabled] = useState(false);
  const [hoursStart, setHoursStart] = useState("22");
  const [hoursEnd, setHoursEnd] = useState("6");
  const [requirePin, setRequirePin] = useState(false);
  const [pin, setPin] = useState("");
  const qc = useQueryClient();

  const { data: control } = useQuery({
    queryKey: ["parental", profileId],
    queryFn: () => profilesApi.getParentalControl(profileId),
    enabled: !!profileId,
  });

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: () => referencesApi.listAll(),
    staleTime: Infinity,
  });

  const genres =
    ((refs as { genres?: Array<{ code: string; label: string }> })?.genres ??
      []) as Array<{ code: string; label: string }>;

  useEffect(() => {
    const c = control;
    if (!c) return;
    setMaxMaturity(resolveMaxMaturityCode(c) ?? "ALL");
    setBlockedGenres(c.blockedGenreCodes ?? []);
    const hasHours =
      c.restrictedHoursStart != null && c.restrictedHoursEnd != null;
    setHoursEnabled(hasHours);
    if (hasHours) {
      setHoursStart(String(c.restrictedHoursStart));
      setHoursEnd(String(c.restrictedHoursEnd));
    }
    setRequirePin(Boolean(c.requirePin));
  }, [control]);

  const save = useMutation({
    mutationFn: () => {
      const start = hoursEnabled ? Number.parseInt(hoursStart, 10) : null;
      const end = hoursEnabled ? Number.parseInt(hoursEnd, 10) : null;
      return profilesApi.upsertParentalControl(profileId, {
        maxMaturityRatingCode: maxMaturity,
        blockedGenreCodes: blockedGenres,
        restrictedHoursStart: Number.isFinite(start) ? start : null,
        restrictedHoursEnd: Number.isFinite(end) ? end : null,
        requirePin,
        ...(pin.length >= 4 ? { pin } : {}),
      } as Parameters<typeof profilesApi.upsertParentalControl>[1] & { pin?: string });
    },
    onSuccess: () => {
      toast.success("Contrôle parental enregistré.");
      qc.invalidateQueries({ queryKey: ["parental", profileId] });
      setPin("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleGenre = (code: string) => {
    setBlockedGenres((prev) =>
      prev.includes(code) ? prev.filter((g) => g !== code) : [...prev, code],
    );
  };

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

      {genres.length > 0 ? (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Genres bloqués</Text>
          <View style={styles.genreWrap}>
            {genres.map((g) => (
              <FilterPill
                key={g.code}
                label={g.label}
                active={blockedGenres.includes(g.code)}
                onPress={() => toggleGenre(g.code)}
              />
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.hoursRow}>
        <Text style={styles.label}>Heures de couvre-feu</Text>
        <Switch
          value={hoursEnabled}
          onValueChange={setHoursEnabled}
          trackColor={{ true: colors.magenta, false: colors.border }}
        />
      </View>
      {hoursEnabled ? (
        <View style={styles.hoursInputs}>
          <View style={styles.hourField}>
            <Text style={styles.hourLabel}>De (h)</Text>
            <TextInput
              style={styles.input}
              value={hoursStart}
              onChangeText={setHoursStart}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.hourField}>
            <Text style={styles.hourLabel}>À (h)</Text>
            <TextInput
              style={styles.input}
              value={hoursEnd}
              onChangeText={setHoursEnd}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.hoursRow}>
        <Text style={styles.label}>Exiger un PIN à la lecture</Text>
        <Switch
          value={requirePin}
          onValueChange={setRequirePin}
          trackColor={{ true: colors.magenta, false: colors.border }}
        />
      </View>

      {requirePin ? (
        <TextInput
          style={styles.input}
          placeholder="PIN parental (4 chiffres min.)"
          placeholderTextColor={colors.muted}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
      ) : null}

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
  genreWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  hoursInputs: { flexDirection: "row", gap: 12, marginBottom: 8 },
  hourField: { flex: 1, gap: 6 },
  hourLabel: { ...typography.caption },
  input: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.foreground,
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
