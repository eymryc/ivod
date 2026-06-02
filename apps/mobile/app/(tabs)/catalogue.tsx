import { Redirect } from "expo-router";

/** Ancienne route — redirige vers Recherche */
export default function CatalogueRedirect() {
  return <Redirect href="/(tabs)/search" />;
}
