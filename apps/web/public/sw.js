// iVOD Service Worker — Web Push notifications

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "iVOD", body: event.data.text() };
  }

  const title = payload.title ?? "iVOD";
  const options = {
    body: payload.body ?? "",
    icon: "/logo/logo_sans_fond.png",
    badge: "/logo/logo_sans_fond.png",
    data: payload.data ?? {},
    tag: payload.tag ?? "ivod-notification",
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  let url = "/";

  // Navigation selon le type de notification
  if (data.contentId) url = `/content/${data.contentId}`;
  else if (data.creatorId) url = `/creator/${data.creatorId}`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus().then((c) => c.navigate(url));
      return self.clients.openWindow(url);
    })
  );
});
