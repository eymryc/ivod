import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserMinus } from "lucide-react-native";
import { BackButton } from "@/components/layout/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { creatorsApi, followsApi } from "@/infrastructure/api";
import { useAuthStore } from "@/store/auth.store";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { GradientText } from "@/components/layout/GradientText";
import { AccentLine } from "@/components/layout/AccentLine";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function CreatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: creator, isLoading } = useQuery({
    queryKey: ["creator", id],
    queryFn: () => creatorsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: followStatus } = useQuery({
    queryKey: ["follow", id],
    queryFn: () => followsApi.status(id!),
    enabled: !!id && isAuth,
  });

  const { data: contents } = useQuery({
    queryKey: ["creator-contents", id],
    queryFn: () => creatorsApi.contents(id!),
    enabled: !!id,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (followStatus?.isFollowing) await followsApi.unfollow(id!);
      else await followsApi.follow(id!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow", id] }),
    onError: (e: Error) => Alert.alert("Erreur", e.message),
  });

  const c = creator as Record<string, unknown> | undefined;
  const items = ((contents as { items?: ContentItem[] })?.items ?? []) as ContentItem[];

  if (isLoading) {
    return (
      <PageCanvas>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.magenta} size="large" />
        </View>
      </PageCanvas>
    );
  }

  const name = (c?.stageName as string) ?? "Créateur";

  return (
    <PageCanvas>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BackButton />

        <View style={styles.hero}>
          <LinearGradient
            colors={["rgba(123,0,153,0.35)", "rgba(0,5,13,0.95)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <GradientText style={styles.kicker}>Créateur</GradientText>
          <AccentLine width={48} style={{ marginVertical: 12 }} />
          <Text style={styles.name}>{name}</Text>
          {c?.bio ? <Text style={styles.bio}>{c.bio as string}</Text> : null}
          <Text style={styles.subs}>
            {Number(c?.subscriberCount ?? 0).toLocaleString("fr-FR")} abonnés
          </Text>
          {isAuth ? (
            <TouchableOpacity
              style={[styles.followBtn, followStatus?.isFollowing && styles.followActive]}
              onPress={() => toggleFollow.mutate()}
              disabled={toggleFollow.isPending}
            >
              {followStatus?.isFollowing ? (
                <UserMinus color={colors.foreground} size={18} />
              ) : (
                <UserPlus color="#fff" size={18} />
              )}
              <Text
                style={[
                  styles.followText,
                  followStatus?.isFollowing && styles.followTextMuted,
                ]}
              >
                {followStatus?.isFollowing ? "Ne plus suivre" : "Suivre"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.gridSection}>
          <SectionHeader title="Catalogue" subtitle={`${items.length} titre(s)`} />
          <View style={styles.grid}>
            {items.map((item) => (
              <View key={item.id} style={styles.cell}>
                <ContentCard item={item} />
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 },
  hero: {
    marginHorizontal: layout.pagePaddingX,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.65)",
    overflow: "hidden",
    gap: 4,
  },
  kicker: { fontSize: 10, letterSpacing: 2.8 },
  name: { ...typography.h1, fontSize: 26 },
  bio: { ...typography.bodyMuted, marginTop: 8, lineHeight: 22 },
  subs: {
    ...typography.caption,
    color: colors.magenta,
    fontWeight: "700",
    marginTop: 8,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.magenta,
  },
  followActive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  followTextMuted: { color: colors.foreground },
  gridSection: { marginTop: 20, paddingHorizontal: layout.pagePaddingX },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
  },
  cell: { width: "48%" },
});
