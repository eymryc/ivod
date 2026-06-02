import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react-native";
import { paymentsApi } from "@/infrastructure/api";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ListCard } from "@/components/layout/ListCard";
import { Button } from "@/components/ui/Button";
import { toast } from "@/presentation/utils/toast";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function RefundsScreen() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: refunds = [] } = useQuery({
    queryKey: ["refunds"],
    queryFn: () => paymentsApi.getRefunds(),
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsApi.list(1, 20),
  });

  const request = useMutation({
    mutationFn: ({ paymentId, reason: r }: { paymentId: string; reason: string }) =>
      paymentsApi.requestRefund(paymentId, r || undefined),
    onSuccess: () => {
      toast.success("Demande de remboursement envoyée.");
      setExpandedId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["refunds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundList = refunds as Array<{ id: string; paymentId?: string; status?: string; reason?: string }>;
  const paymentList = ((payments as { items?: unknown[] })?.items ?? []) as Array<{
    id: string;
    amount?: number;
    status?: { code?: string };
    createdAt?: string;
  }>;
  const refundedIds = new Set(refundList.map((r) => r.paymentId));
  const eligible = paymentList.filter(
    (p) => p.status?.code === "COMPLETED" && !refundedIds.has(p.id),
  );

  return (
    <SettingsPage title="Remboursements" description="Demandes et paiements éligibles." icon={RotateCcw}>
      <Text style={styles.section}>Mes demandes</Text>
      <FlatList
        data={refundList}
        keyExtractor={(r) => r.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>Aucune demande</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ListCard
            title={`Paiement ${item.paymentId?.slice(0, 8)}…`}
            meta={item.status}
          />
        )}
      />
      <Text style={[styles.section, { marginTop: 20 }]}>Paiements éligibles</Text>
      <FlatList
        data={eligible}
        keyExtractor={(p) => p.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>Aucun paiement éligible</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.eligible}>
            <TouchableOpacity onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <ListCard
                title={`${item.amount?.toLocaleString("fr-FR")} FCFA`}
                meta={item.createdAt?.slice(0, 10)}
              />
            </TouchableOpacity>
            {expandedId === item.id ? (
              <View style={styles.expand}>
                <TextInput
                  style={styles.input}
                  placeholder="Motif (optionnel)"
                  placeholderTextColor={colors.muted}
                  value={reason}
                  onChangeText={setReason}
                />
                <Button
                  title="Demander un remboursement"
                  onPress={() => request.mutate({ paymentId: item.id, reason })}
                  loading={request.isPending}
                />
              </View>
            ) : null}
          </View>
        )}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.h3, marginBottom: 8 },
  empty: { ...typography.bodyMuted },
  eligible: { gap: 0 },
  expand: { gap: 10, marginTop: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    padding: 10,
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
