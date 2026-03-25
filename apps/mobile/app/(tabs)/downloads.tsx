import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Download, Trash2, Play } from 'lucide-react-native';

export default function DownloadsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => api.get<any[]>('/users/me/downloads'),
    enabled: isAuthenticated,
  });

  const { mutate: deleteDownload } = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/downloads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['downloads'] }),
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Download color="#4B5563" size={48} />
        <Text style={styles.emptyTitle}>Téléchargements hors-ligne</Text>
        <Text style={styles.emptyText}>Connectez-vous pour accéder à vos contenus téléchargés.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isLoading && downloads.length === 0) {
    return (
      <View style={styles.centered}>
        <Download color="#4B5563" size={48} />
        <Text style={styles.emptyTitle}>Aucun téléchargement</Text>
        <Text style={styles.emptyText}>
          Téléchargez des contenus pour les regarder sans connexion.
        </Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(tabs)/catalogue')}>
          <Text style={styles.loginBtnText}>Parcourir le catalogue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={downloads}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TouchableOpacity
              style={styles.itemLeft}
              onPress={() => router.push(`/watch/${item.contentId}`)}
              activeOpacity={0.8}
            >
              <View style={styles.thumb}>
                {item.content?.thumbnailUrl
                  ? <Image source={{ uri: item.content.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#2A2A3E' }]} />
                }
                <View style={styles.playOverlay}>
                  <Play color="#fff" size={18} fill="#fff" />
                </View>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.content?.title}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quality} · Expire le {new Date(item.expiresAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => Alert.alert(
                'Supprimer',
                'Supprimer ce téléchargement ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => deleteDownload(item.id) },
                ],
              )}
            >
              <Trash2 color="#EF4444" size={20} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#111118' },
  centered:     { flex: 1, backgroundColor: '#111118', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  emptyText:    { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  loginBtn:     { marginTop: 8, backgroundColor: '#4B44C8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list:         { padding: 16, gap: 12 },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A26', borderRadius: 12, overflow: 'hidden' },
  itemLeft:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb:        { width: 88, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: '#2A2A3E', position: 'relative' },
  playOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  itemInfo:     { flex: 1 },
  itemTitle:    { fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 19 },
  itemMeta:     { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  deleteBtn:    { padding: 16 },
});
