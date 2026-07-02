import { BrowseCatalog } from "@/components/catalog/BrowseCatalog";
import { FILMS_SECTION } from "@/lib/catalog/sections";

export default function FilmsPage() {
  return <BrowseCatalog section={FILMS_SECTION} />;
}
