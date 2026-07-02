import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { layout } from '@/theme/layout';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Chevauche le hero (accueil / catalogue) */
  floating?: boolean;
  /** `bare` : pills seules, sans boîte (overlay hero) */
  variant?: 'glass' | 'bare';
}

/** Barre de filtres — glass léger ou pills nues sur hero */
export function PremiumPillDock({
  children,
  style,
  floating,
  variant = 'glass',
}: Props) {
  if (variant === 'bare') {
    return <View style={[styles.bare, style]}>{children}</View>;
  }

  return (
    <View style={[styles.wrap, floating && styles.floating, style]}>
      <LinearGradient
        colors={['rgba(230,0,126,0.55)', 'rgba(255,123,0,0.45)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />
      <LinearGradient
        colors={['rgba(0,5,13,0.42)', 'rgba(0,5,13,0.28)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bare: {
    zIndex: 8,
  },
  wrap: {
    marginHorizontal: layout.pagePaddingX,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,0,126,0.28)',
    borderRadius: layout.radiusSm,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,5,13,0.25)',
  },
  floating: {
    marginTop: -22,
    zIndex: 5,
  },
  topAccent: {
    height: 2,
    width: '100%',
  },
  inner: {
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
});
