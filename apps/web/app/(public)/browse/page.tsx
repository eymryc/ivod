import { redirect } from "next/navigation";
import { TYPE_TO_SECTION_PATH } from "@/lib/catalog/sections";

type SearchParams = Record<string, string | string[] | undefined>;

function buildQuery(params: SearchParams, omit: string[] = []) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key) || value == null) continue;
    qs.set(key, Array.isArray(value) ? value[0] : value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** Ancienne route catalogue → pages dédiées ou films par défaut. */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type : undefined;

  if (type && TYPE_TO_SECTION_PATH[type]) {
    redirect(`${TYPE_TO_SECTION_PATH[type]}${buildQuery(params, ["type"])}`);
  }

  redirect(`/films${buildQuery(params, ["type"])}`);
}
