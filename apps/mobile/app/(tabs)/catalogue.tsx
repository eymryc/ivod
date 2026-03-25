import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Search } from 'lucide-react-native';

const CATEGORIES = [
  { id: '', label: 'Tout' },
  { id: 'HUMOUR', label: 'Humour' },
  { id: 'SERIE', label: 'Séries' },
  { id: 'FILM', label: 'Films' },
  { id: 'DOCUMENTAIRE', label: 'Docs' },
  { id: 'CLIP', label: 'Clips' },
];

export default function CatalogueScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const qs = new URLSearchParams({ limit: '30', ...(category && { category }), ...(search && { search }) });
  const { data, isLoading } = useQuery({
    queryKey: ['catalogue', category, search],
    queryFn: () => api.get<any>(`/contents?${qs}`),
  });

  const items = data?.items ?? [];

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Search color="#6B7280" size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtres catégorie */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterBtn, category === item.id && styles.filterBtnActive]}
            onPress={() => setCategory(item.id)}
          >
            <Text style={[styles.filterText, category === item.id && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Grille de contenus */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4B44C8" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucun contenu trouvé</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push(`/watch/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.gridThumb}>
                {item.thumbnailUrl
                  ? <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#2A2A3E' }]} />
                }
                {item.visibility === 'PREMIUM_ONLY' && (
                  <View style={styles.premBadge}><Text style={styles.premText}>Premium</Text></View>
                )}
              </View>
              <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.gridCreator} numberOfLines={1}>{item.creator?.stageName}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#111118' },
  searchBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: '#1A1A26', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2A2A3E' },
  searchInput:     { flex: 1, fontSize: 15, color: '#fff' },
  filters:         { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1A1A26', borderWidth: 1, borderColor: '#2A2A3E' },
  filterBtnActive: { backgroundColor: '#4B44C8', borderColor: '#4B44C8' },
  filterText:      { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText:       { color: '#6B7280', fontSize: 15 },
  grid:            { paddingHorizontal: 12, paddingBottom: 24 },
  row:             { gap: 12, marginBottom: 16 },
  gridItem:        { flex: 1 },
  gridThumb:       { aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1A1A26', marginBottom: 6 },
  premBadge:       { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(234,179,8,0.9)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  premText:        { fontSize: 9, fontWeight: '700', color: '#000' },
  gridTitle:       { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18 },
  gridCreator:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
