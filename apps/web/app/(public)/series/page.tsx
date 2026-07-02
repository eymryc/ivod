import { BrowseCatalog } from "@/components/catalog/BrowseCatalog";
import { SERIES_SECTION } from "@/lib/catalog/sections";

export default function SeriesPage() {
  return <BrowseCatalog section={SERIES_SECTION} />;
}
