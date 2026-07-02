import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { reviewsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/theme/colors";

interface ReviewItem {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  profile?: { name?: string };
  userId?: string;
}

interface Props {
  contentId: string;
}

export function ReviewsSection({ contentId }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.reviews.list(contentId),
    queryFn: () => reviewsApi.list(contentId),
  });

  const upsert = useMutation({
    mutationFn: () => {
      if (rating < 1) throw new Error("Choisissez une note de 1 à 5.");
      return reviewsApi.upsert(contentId, rating, undefined, body.trim() || undefined);
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: QueryKeys.reviews.list(contentId) });
      Alert.alert("Merci", "Votre avis a été enregistré.");
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  const items = (data as { items?: ReviewItem[] })?.items ?? [];
  const avg =
    items.length > 0
      ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1)
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Star color={colors.gold} size={18} fill={colors.gold} />
        <Text style={styles.title}>
          Avis {avg ? `· ${avg}/5` : ""} ({items.length})
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.magenta} style={{ marginVertical: 12 }} />
      ) : (
        items.slice(0, 5).map((r) => (
          <View key={r.id} style={styles.review}>
            <Text style={styles.stars}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
            <Text style={styles.author}>{r.profile?.name ?? "Utilisateur"}</Text>
            {r.body ? <Text style={styles.body}>{r.body}</Text> : null}
          </View>
        ))
      )}

      {isAuth ? (
        <View style={styles.form}>
          <Text style={styles.label}>Votre note</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Star
                  size={28}
                  color={n <= rating ? colors.gold : colors.muted}
                  fill={n <= rating ? colors.gold : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Votre avis (optionnel)…"
            placeholderTextColor={colors.muted}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, rating < 1 && styles.btnDisabled]}
            disabled={rating < 1 || upsert.isPending}
            onPress={() => upsert.mutate()}
          >
            <Text style={styles.btnText}>Publier</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>Connectez-vous pour noter ce contenu.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  review: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  stars: { color: colors.gold, fontSize: 14, letterSpacing: 2 },
  author: { fontSize: 13, fontWeight: "700", color: colors.magenta },
  body: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  form: { gap: 8, marginTop: 4 },
  label: { fontSize: 12, color: colors.muted },
  starRow: { flexDirection: "row", gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
  },
  btn: {
    backgroundColor: colors.magenta,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700" },
  hint: { fontSize: 12, color: colors.muted },
});
