import { useState, useEffect } from "react";
import { Text } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { User } from "lucide-react-native";
import { usersApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/SettingsShell";
import { toast } from "@/presentation/utils/toast";
import { typography } from "@/theme/typography";

export default function SettingsProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

  const save = useMutation({
    mutationFn: () => usersApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: (data) => {
      const d = data as { firstName?: string; lastName?: string; name?: string };
      setUser({ ...user!, firstName: d.firstName, lastName: d.lastName, name: d.name });
      toast.success("Informations mises à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsPanel>
      <SettingsSectionHeader
        icon={User}
        title="Informations personnelles"
        description="Mettez à jour votre identité associée à votre compte iVOD."
      />
      <Text style={[typography.bodyMuted, { marginBottom: 12 }]}>{user?.email}</Text>
      <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
      <Input label="Nom" value={lastName} onChangeText={setLastName} />
      <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} />
    </SettingsPanel>
  );
}
