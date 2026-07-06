import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, Shield } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export function WatchPreviewBadge() {
  return (
    <View style={[styles.badge, styles.preview]}>
      <Sparkles color={colors.magenta} size={10} />
      <Text style={[styles.text, styles.previewText]}>Aperçu studio</Text>
    </View>
  );
}

export function WatchModerationBadge() {
  return (
    <View style={[styles.badge, styles.moderation]}>
      <Shield color="#fcd34d" size={10} />
      <Text style={[styles.text, styles.moderationText]}>Modération</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  preview: {
    backgroundColor: 'rgba(230,0,126,0.2)',
  },
  moderation: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  previewText: { color: colors.magenta },
  moderationText: { color: '#fcd34d' },
});
