import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { User, Crown, History, Download, LogOut, ChevronRight, BarChart2 } from 'lucide-react-native';

export default function ProfilScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<any>('/auth/me'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <User color="#4B5563" size={48} />
        <Text style={styles.guestTitle}>Mon profil</Text>
        <Text style={styles.guestText}>Connectez-vous pour accéder à votre profil et votre historique.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPremium = user?.plan !== 'FREE';

  function handleLogout() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: logout },
    ]);
  }

  const menuItems = [
    { icon: Crown, label: 'Abonnement', sub: user?.plan ?? 'FREE', onPress: () => {} },
    { icon: History, label: 'Historique de visionnage', sub: `${me?.stats?.watchedCount ?? 0} contenus`, onPress: () => {} },
    { icon: Download, label: 'Téléchargements', sub: `${me?.stats?.downloadCount ?? 0} / ${me?.stats?.downloadLimit ?? 3}`, onPress: () => router.push('/(tabs)/downloads') },
    ...(user?.role === 'CREATOR' ? [{ icon: BarChart2, label: 'Dashboard créateur', sub: 'Analytics & revenus', onPress: () => {} }] : []),
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.planBadge, isPremium && styles.planBadgePremium]}>
          <Text style={[styles.planText, isPremium && styles.planTextPremium]}>
            {user?.plan}
          </Text>
        </View>
      </View>

      {/* Stats */}
      {me?.stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{me.stats.watchedCount}</Text>
            <Text style={styles.statLabel}>Visionnés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{me.stats.downloadCount}</Text>
            <Text style={styles.statLabel}>Téléchargés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{me.stats.downloadLimit}</Text>
            <Text style={styles.statLabel}>Quota</Text>
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <item.icon color="#4B44C8" size={20} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
            </View>
            <ChevronRight color="#4B5563" size={18} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut color="#EF4444" size={18} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#111118' },
  centered:         { flex: 1, backgroundColor: '#111118', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  guestTitle:       { fontSize: 20, fontWeight: '700', color: '#fff' },
  guestText:        { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  loginBtn:         { marginTop: 8, backgroundColor: '#4B44C8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  header:           { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 6 },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4B44C8', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText:       { fontSize: 32, fontWeight: '800', color: '#fff' },
  name:             { fontSize: 20, fontWeight: '700', color: '#fff' },
  email:            { fontSize: 13, color: '#9CA3AF' },
  planBadge:        { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#1A1A26', borderWidth: 1, borderColor: '#2A2A3E' },
  planBadgePremium: { backgroundColor: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.4)' },
  planText:         { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  planTextPremium:  { color: '#FBBF24' },
  statsRow:         { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#1A1A26', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A3E' },
  statItem:         { flex: 1, alignItems: 'center' },
  statVal:          { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel:        { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider:      { width: 1, backgroundColor: '#2A2A3E' },
  menu:             { margin: 16, gap: 2 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1A26', padding: 14, borderRadius: 12, marginBottom: 2 },
  menuIcon:         { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(75,68,200,0.15)', justifyContent: 'center', alignItems: 'center' },
  menuText:         { flex: 1 },
  menuLabel:        { fontSize: 15, fontWeight: '600', color: '#fff' },
  menuSub:          { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  logoutBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, padding: 14, borderRadius: 12, backgroundColor: '#1A1A26', borderWidth: 1, borderColor: '#2A2A3E' },
  logoutText:       { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
