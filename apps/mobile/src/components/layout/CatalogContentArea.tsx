import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { layout } from '@/theme/layout';

interface Props {
  children: ReactNode;
  /** Dégradé de transition depuis un hero plein écran */
  fadeFromHero?: boolean;
}

/** Zone catalogue sous le hero — fond premium + respiration */
export function CatalogContentArea({ children, fadeFromHero }: Props) {
  return (
    <View style={styles.wrap}>
      {fadeFromHero ? (
        <LinearGradient
          colors={['rgba(0,5,13,0.35)', 'transparent']}
          locations={[0, 1]}
          style={styles.fade}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingTop: 4,
  },
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    zIndex: 0,
  },
  inner: {
    gap: layout.railGap,
    paddingBottom: 8,
  },
});
