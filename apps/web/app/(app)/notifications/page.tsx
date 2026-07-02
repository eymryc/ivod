import type { Metadata } from "next";
import { PAGE_X } from "@/components/public/PublicShell";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="min-h-screen">
      <div className={`max-w-2xl mx-auto py-8 ${PAGE_X}`}>
        <NotificationsClient />
      </div>
    </div>
  );
}
