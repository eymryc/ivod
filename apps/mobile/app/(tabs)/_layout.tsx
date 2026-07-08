import { Tabs } from "expo-router";
import { Home, Search, Heart, Download, User } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { fontFamily } from "@/theme/typography";
import { useTabBarLayout } from "@/presentation/hooks/use-tab-bar-layout";

export default function TabsLayout() {
  const { tabBarStyle } = useTabBarLayout();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "rgba(0,5,13,0.98)",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          ...tabBarStyle,
        },
        tabBarActiveTintColor: colors.magenta,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontFamily: fontFamily.semiBold },
        headerStyle: { backgroundColor: colors.backgroundElevated },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: fontFamily.semiBold },
        headerShown: false,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Recherche",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoris",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Télécharg.",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Download color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="catalogue" options={{ href: null }} />
      {/* Films / Séries / Web-séries / Animation — barre du bas visible, hors icônes */}
      <Tabs.Screen name="catalog" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
