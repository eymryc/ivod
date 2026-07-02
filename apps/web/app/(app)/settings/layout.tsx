import { SettingsShell } from "@/components/settings/SettingsUI";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
