import { BrandLoader } from "@/components/ui/BrandLoader";

export default function SettingsLoading() {
  return (
    <BrandLoader
      fullScreen={false}
      size="md"
      tagline="Paramètres"
      className="min-h-[50vh]"
    />
  );
}
