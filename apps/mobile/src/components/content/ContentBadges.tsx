import { View, Text, StyleSheet } from 'react-native';
import {
  viewerOfferLabel,
  viewerOfferBadgeColor,
  viewerOfferBadgeTextColor,
  shouldShowOfferBadgeOnCard,
} from '@/core/constants/monetization';
import { colors } from '@/theme/colors';

interface Props {
  isExclusive?: boolean;
  visibility?: string | null;
  ppvPrice?: number | null;
  maturityCode?: string | null;
  quality?: 'SD' | 'HD' | 'FHD' | '4K' | null;
  isAuthenticated?: boolean;
}

const MATURITY_COLORS: Record<string, { bg: string; fg: string }> = {
  '-18': { bg: '#dc2626', fg: '#fff' },
  '-16': { bg: '#f97316', fg: '#fff' },
  '-12': { bg: '#eab308', fg: '#000' },
};

const QUALITY_LABELS: Record<string, string> = {
  FHD: 'HD',
  '4K': '4K',
  HD: 'HD',
};

export function ContentBadges({
  isExclusive,
  visibility,
  ppvPrice,
  maturityCode,
  quality,
  isAuthenticated = false,
}: Props) {
  const offerLabel = viewerOfferLabel(visibility, ppvPrice);
  const showOffer = shouldShowOfferBadgeOnCard(isAuthenticated, visibility, offerLabel);

  return (
    <View style={styles.row}>
      {isExclusive ? (
        <View style={[styles.badge, styles.exclusive]}>
          <Text style={styles.exclusiveText}>EXCLUSIF</Text>
        </View>
      ) : null}
      {showOffer && offerLabel ? (
        <View style={[styles.badge, { backgroundColor: viewerOfferBadgeColor(visibility) }]}>
          <Text style={[styles.badgeText, { color: viewerOfferBadgeTextColor(visibility) }]}>
            {offerLabel}
          </Text>
        </View>
      ) : null}
      {quality && QUALITY_LABELS[quality] ? (
        <View style={[styles.badge, styles.quality]}>
          <Text style={styles.badgeText}>{QUALITY_LABELS[quality]}</Text>
        </View>
      ) : null}
      {maturityCode && maturityCode !== 'ALL' ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: MATURITY_COLORS[maturityCode]?.bg ?? colors.surface },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: MATURITY_COLORS[maturityCode]?.fg ?? colors.foreground },
            ]}
          >
            {maturityCode}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4 },
  exclusive: { backgroundColor: colors.magenta },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  quality: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.foreground },
});
