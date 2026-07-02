import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Rajdhani_300Light,
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from "@expo-google-fonts/rajdhani";

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

  useEffect(() => {
    if (loaded) onReady?.();
  }, [loaded, onReady]);

  if (!loaded) return null;

  return <>{children}</>;
}
