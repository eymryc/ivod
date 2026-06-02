import { useFonts } from "expo-font";
import {
  Rajdhani_300Light,
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";
import * as SplashScreen from "expo-splash-screen";

interface Props {
  children: React.ReactNode;
  onReady?: () => void;
}

export function FontProvider({ children, onReady }: Props) {
  const [loaded] = useFonts({
    Rajdhani_300Light,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  if (!loaded) return null;

  onReady?.();
  return <>{children}</>;
}
