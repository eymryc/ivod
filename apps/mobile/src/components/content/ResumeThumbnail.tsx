import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ResumePreview } from '@/core/entities/resume-preview.entity';
import { videoAssetUrl } from '@/utils/assets';

type Props = {
  preview: ResumePreview;
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Affiche une tuile du sprite storyboard (crop) — vignette à la seconde exacte.
 */
export function ResumeThumbnail({ preview, width, height, borderRadius = 0, style }: Props) {
  const spriteUrl = preview.spriteUrl ?? videoAssetUrl(preview.spriteObjectKey);
  if (!spriteUrl) return null;

  const { frame } = preview;
  const scaleX = width / frame.w;
  const scaleY = height / frame.h;
  const scale = Math.max(scaleX, scaleY);

  return (
    <View style={[styles.clip, { width, height, borderRadius }, style]}>
      <Image
        source={{ uri: spriteUrl }}
        style={{
          width: frame.spriteWidth * scale,
          height: frame.spriteHeight * scale,
          transform: [
            { translateX: -frame.x * scale },
            { translateY: -frame.y * scale },
          ],
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#111' },
});
