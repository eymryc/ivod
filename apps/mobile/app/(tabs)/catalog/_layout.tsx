import { Stack } from "expo-router";
import { colors } from "@/theme/colors";
import { fontFamily } from "@/theme/typography";

/** Stack imbriqué Films / Séries / Web-séries / Animation — reste dans les tabs. */
export default function CatalogTabsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fontFamily.semiBold },
      }}
    />
  );
}
