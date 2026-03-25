import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Video, { VideoRef } from 'react-native-video';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ArrowLeft, Download, Share2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const videoRef = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: () => api.get<any>(`/contents/${id}`),
    enabled: !!id,
  });

  const { data: stream } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => api.get<{ playbackUrl: string }>(`/videos/${id}/stream`),
    enabled: !!id && isAuthenticated,
    staleTime: 20 * 60 * 1000,
  });

  const { mutate: saveProgress } = useMutation({
    mutationFn: (seconds: number) =>
      api.post(`/contents/${id}/progress`, { watchedSeconds: Math.round(seconds) }),
  });

  // Sauvegarde périodique de la progression
  const scheduleProgressSave = (seconds: number) => {
    setCurrentTime(seconds);
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => saveProgress(seconds), 15_000);
  };

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
      if (progressTimer.current) clearTimeout(progressTimer.current);
      if (currentTime > 0) saveProgress(currentTime);
    };
  }, []);

  if (contentLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4B44C8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color="#fff" size={24} />
      </TouchableOpacity>

      {/* Lecteur vidéo */}
      <View style={styles.playerContainer}>
        {stream?.playbackUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: stream.playbackUrl }}
            style={styles.video}
            resizeMode="contain"
            paused={paused}
            controls
            onProgress={({ currentTime: t }) => scheduleProgressSave(t)}
            onEnd={() => {
              if (progressTimer.current) clearTimeout(progressTimer.current);
              saveProgress(999999);
            }}
            onError={(e) => console.error('Video error', e)}
          />
        ) : (
          <View style={[styles.video, styles.noStream]}>
            {content?.thumbnailUrl && (
              <Image
                source={{ uri: content.thumbnailUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}
            <View style={styles.noStreamOverlay}>
              {isAuthenticated ? (
                <ActivityIndicator size="large" color="#4B44C8" />
              ) : (
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => router.push('/auth/login')}
                >
                  <Text style={styles.loginBtnText}>Se connecter pour regarder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Infos contenu */}
      <ScrollView style={styles.info} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{content?.title}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>{content?.viewCount?.toLocaleString('fr-FR')} vues</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, styles.category]}>
            {content?.category?.toLowerCase()}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Download color="#9CA3AF" size={20} />
            <Text style={styles.actionLabel}>Télécharger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Share2 color="#9CA3AF" size={20} />
            <Text style={styles.actionLabel}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Créateur */}
        {content?.creator && (
          <View style={styles.creator}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>
                {content.creator.stageName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.creatorName}>{content.creator.stageName}</Text>
              <Text style={styles.creatorSubs}>
                {content.creator.subscriberCount?.toLocaleString('fr-FR')} abonnés
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {content?.description && (
          <View style={styles.descBox}>
            <Text style={styles.desc}>{content.description}</Text>
          </View>
        )}

        {/* Tags */}
        {content?.tags?.length > 0 && (
          <View style={styles.tags}>
            {content.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#111118' },
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111118' },
  backButton:      { position: 'absolute', top: 48, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  playerContainer: { width: SCREEN_WIDTH, aspectRatio: 16 / 9, backgroundColor: '#000' },
  video:           { width: '100%', height: '100%' },
  noStream:        { backgroundColor: '#1A1A26', overflow: 'hidden' },
  noStreamOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loginBtn:        { backgroundColor: '#4B44C8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  info:            { flex: 1, padding: 16 },
  title:           { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  meta:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText:        { fontSize: 13, color: '#9CA3AF' },
  metaDot:         { color: '#4B5563' },
  category:        { textTransform: 'capitalize' },
  actions:         { flexDirection: 'row', gap: 16, marginTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  actionBtn:       { alignItems: 'center', gap: 4 },
  actionLabel:     { fontSize: 11, color: '#9CA3AF' },
  creator:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, backgroundColor: '#1A1A26', borderRadius: 12 },
  creatorAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4B44C8', justifyContent: 'center', alignItems: 'center' },
  creatorAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  creatorName:     { fontSize: 15, fontWeight: '600', color: '#fff' },
  creatorSubs:     { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  descBox:         { marginTop: 16, padding: 12, backgroundColor: '#1A1A26', borderRadius: 12 },
  desc:            { fontSize: 14, color: '#D1D5DB', lineHeight: 20 },
  tags:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag:             { backgroundColor: '#2A2A3E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:         { fontSize: 12, color: '#9CA3AF' },
});
