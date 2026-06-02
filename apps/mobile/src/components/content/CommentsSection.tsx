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
import { MessageCircle, Send } from "lucide-react-native";
import { commentsApi } from "@/infrastructure/api";
import { QueryKeys } from "@/core/constants/query-keys";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/theme/colors";

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  profile?: { name?: string };
  replies?: CommentItem[];
}

interface Props {
  contentId: string;
}

export function CommentsSection({ contentId }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.comments.list(contentId),
    queryFn: () => commentsApi.list(contentId),
  });

  const post = useMutation({
    mutationFn: () => commentsApi.create(contentId, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: QueryKeys.comments.list(contentId) });
    },
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  const items = (data as { items?: CommentItem[] })?.items ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <MessageCircle color={colors.magenta} size={18} />
        <Text style={styles.title}>Commentaires ({items.length})</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.magenta} style={{ marginVertical: 12 }} />
      ) : (
        items.slice(0, 10).map((c) => (
          <View key={c.id} style={styles.comment}>
            <Text style={styles.author}>{c.profile?.name ?? "Utilisateur"}</Text>
            <Text style={styles.body}>{c.body}</Text>
            <Text style={styles.date}>
              {new Date(c.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        ))
      )}

      {isAuth ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Votre commentaire…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.send, !text.trim() && styles.sendDisabled]}
            disabled={!text.trim() || post.isPending}
            onPress={() => post.mutate()}
          >
            <Send color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>Connectez-vous pour commenter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  comment: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  author: { fontSize: 13, fontWeight: "700", color: colors.magenta },
  body: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  date: { fontSize: 11, color: colors.muted },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  send: {
    backgroundColor: colors.magenta,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
  hint: { fontSize: 12, color: colors.muted },
});
