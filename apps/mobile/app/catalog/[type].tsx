import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Compat deep links `/catalog/:type` → catalogue dans les tabs
 * (barre du bas conservée).
 */
export default function CatalogTypeRedirect() {
  const { type, ...rest } = useLocalSearchParams<{ type: string } & Record<string, string>>();
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (key === "type") continue;
    if (typeof value === "string" && value) qs.set(key, value);
  }
  const suffix = qs.toString();
  const slug = type || "films";
  return (
    <Redirect href={`/(tabs)/catalog/${slug}${suffix ? `?${suffix}` : ""}` as never} />
  );
}
