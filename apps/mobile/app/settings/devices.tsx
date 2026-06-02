import { View, FlatList, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor } from "lucide-react-native";
import { devicesApi } from "@/infrastructure/api";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ListCard } from "@/components/layout/ListCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/theme/colors";

export default function DevicesScreen() {
  const qc = useQueryClient();
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => devicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  const list = devices as Array<{
    id: string;
    deviceName?: string;
    deviceType?: string;
    lastSeenAt?: string;
  }>;

  return (
    <SettingsPage
      title="Appareils"
      description="Sessions connectées à votre compte."
      icon={Monitor}
    >
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <EmptyState icon={Monitor} title="Aucun appareil" description="Aucune session enregistrée." />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item: d }) => (
          <ListCard
            title={d.deviceName ?? d.deviceType ?? "Appareil"}
            meta={
              d.lastSeenAt
                ? `Vu ${new Date(d.lastSeenAt).toLocaleDateString("fr-FR")}`
                : undefined
            }
            right={
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Retirer", "Déconnecter cet appareil ?", [
                    { text: "Annuler", style: "cancel" },
                    { text: "Retirer", style: "destructive", onPress: () => remove.mutate(d.id) },
                  ])
                }
              >
                <Text style={styles.remove}>Retirer</Text>
              </TouchableOpacity>
            }
          />
        )}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  remove: { color: colors.error, fontSize: 13, fontWeight: "600" },
});
