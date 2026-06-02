import { FlatList, View, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react-native";
import { devicesApi } from "@/infrastructure/api";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ListCard } from "@/components/layout/ListCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default function LoginHistoryScreen() {
  const { data } = useQuery({
    queryKey: ["login-history"],
    queryFn: () => devicesApi.loginHistory(1, 50),
  });

  const items = (data as { items?: unknown[] })?.items ?? [];

  return (
    <SettingsPage title="Connexions" description="Historique des accès à votre compte." icon={LogIn}>
      <FlatList
        data={items as Array<{
          id: string;
          createdAt?: string;
          ipAddress?: string;
          device?: { deviceName?: string; deviceType?: string };
        }>}
        keyExtractor={(i) => i.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <EmptyState icon={LogIn} title="Aucun historique" description="Aucune connexion enregistrée." />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ListCard
            title={item.device?.deviceName ?? item.device?.deviceType ?? "Appareil"}
            meta={[
              item.createdAt ? new Date(item.createdAt).toLocaleString("fr-FR") : "",
              item.ipAddress ? ` · ${item.ipAddress}` : "",
            ]
              .filter(Boolean)
              .join("")}
          />
        )}
      />
    </SettingsPage>
  );
}
