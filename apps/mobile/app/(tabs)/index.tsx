import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { ContentEntity } from '@ivod/types';

function ContentCard({ item }: { item: ContentEntity }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/watch/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.thumbnail}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.thumbnailPlaceholder]} />
        )}
        {item.visibility === 'PREMIUM_ONLY' && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardCreator} numberOfLines={1}>{item.creator?.stageName}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, category }: { title: string; category: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['contents', category],
    queryFn: () => api.get<any>(`/contents?category=${category}&limit=10`),
  });

  const items: ContentEntity[] = data?.items ?? [];
  if (isLoading || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ContentCard item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>iVOD</Text>
        <Text style={styles.headerSub}>Cinéma ivoirien & africain</Text>
      </View>

      <Section title="🎭 Humour & Sketchs" category="HUMOUR" />
      <Section title="📺 Séries"            category="SERIE" />
      <Section title="🎬 Films"             category="FILM" />
      <Section title="📹 Documentaires"     category="DOCUMENTAIRE" />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#111118' },
  header:         { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle:    { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub:      { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  section:        { marginTop: 24 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12, paddingHorizontal: 16 },
  horizontalList: { paddingHorizontal: 16 },
  card:           { width: 160 },
  thumbnail:      { width: 160, height: 90, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1A1A26' },
  thumbnailPlaceholder: { backgroundColor: '#2A2A3E' },
  premiumBadge:   { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(234,179,8,0.9)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  premiumText:    { fontSize: 10, fontWeight: '700', color: '#000' },
  cardInfo:       { marginTop: 6 },
  cardTitle:      { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18 },
  cardCreator:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
