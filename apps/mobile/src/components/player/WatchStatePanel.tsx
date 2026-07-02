import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, gradients } from '@/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function WatchStatePanel({ icon, title, description, children }: Props) {
  return (
    <View style={styles.root}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

export function WatchLoading() {
  return (
    <View style={styles.root}>
      <View style={styles.loadingRing} />
      <Text style={styles.loadingLabel}>Chargement…</Text>
    </View>
  );
}

interface BtnProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export function WatchActionButton({ label, onPress, primary, disabled }: BtnProps) {
  if (primary) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.9}>
        <LinearGradient
          colors={[...gradients.primaryBtn]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btnPrimary, disabled && styles.btnDisabled]}
        >
          <Text style={styles.btnPrimaryText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.btnGhost, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnGhostText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  iconWrap: { marginBottom: 8 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, justifyContent: 'center' },
  btnPrimary: { paddingHorizontal: 24, paddingVertical: 14, minWidth: 200 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 14 },
  btnGhost: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 160,
  },
  btnGhostText: { color: colors.foreground, fontWeight: '600', textAlign: 'center', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  loadingRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopColor: colors.magenta,
    borderRightColor: colors.orange,
    marginBottom: 8,
  },
  loadingLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
});
