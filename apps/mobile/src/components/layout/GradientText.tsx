import { Text, StyleSheet, type TextStyle } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "@/theme/colors";

interface Props {
  children: string;
  style?: TextStyle;
}

/** Texte en dégradé brand — équivalent `.ivod-gradient-text` */
export function GradientText({ children, style }: Props) {
  return (
    <MaskedView maskElement={<Text style={[styles.mask, style]}>{children}</Text>}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.placeholder, style]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  mask: { backgroundColor: "transparent" },
  placeholder: { opacity: 0 },
});
