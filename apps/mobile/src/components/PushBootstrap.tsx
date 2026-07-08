import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/store/auth.store";
import { registerDeviceOnLogin } from '@/infrastructure/services/device.service';
import { getNotificationRoute } from '@/core/notifications/notification-routes';

export function PushBootstrap() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    registerDeviceOnLogin();
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const resolved = getNotificationRoute(data?.type, data);
      if (resolved) {
        router.push(resolved as never);
      } else if (data?.contentId) {
        router.push(`/content/${data.contentId}`);
      } else {
        router.push("/notifications");
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
