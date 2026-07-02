import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface Props {
  text: string;
  maxLines?: number;
  collapseThreshold?: number;
}

export function ExpandableDescription({
  text,
  maxLines = 4,
  collapseThreshold = 280,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.length > collapseThreshold;

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={expanded ? undefined : maxLines}>
        {text}
      </Text>
      {canExpand ? (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setExpanded((e) => !e)}
          hitSlop={8}
        >
          {expanded ? (
            <>
              <ChevronUp color={colors.muted} size={14} />
              <Text style={styles.toggleText}>Voir moins</Text>
            </>
          ) : (
            <>
              <ChevronDown color={colors.muted} size={14} />
              <Text style={styles.toggleText}>Lire la suite</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  text: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleText: { fontSize: 13, color: colors.muted },
});
