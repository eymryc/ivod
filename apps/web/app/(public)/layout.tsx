import { ViewerShell } from "@/components/layout/ViewerShell";
import { hasServerAccessToken } from "@/lib/auth/server-session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const serverHasSession = await hasServerAccessToken();
  return <ViewerShell serverHasSession={serverHasSession}>{children}</ViewerShell>;
}
