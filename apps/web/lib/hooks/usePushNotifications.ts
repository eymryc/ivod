"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../stores/auth.store";
import { devicesApi } from "../api/devices";

// Clé publique VAPID — à configurer dans .env.local
// NEXT_PUBLIC_VAPID_PUBLIC_KEY=<votre_clé_VAPID_publique>
function getVapidKey(): Uint8Array | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return null;
  try {
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const buffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
    return buffer;
  } catch {
    return null;
  }
}

function serializeSubscription(sub: PushSubscription): string {
  const json = sub.toJSON();
  // On envoie l'endpoint comme token — le backend stocke la subscription complète
  return json.endpoint ?? "";
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Permission déjà refusée → ne pas redemander
    if (Notification.permission === "denied") return;

    async function subscribe() {
      try {
        // 1. Enregistrer le service worker
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        // 2. Demander la permission (silencieux si déjà accordée)
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 3. Souscrire au push (avec VAPID si disponible)
        const vapidKey = getVapidKey();
        const subscribeOptions: PushSubscriptionOptionsInit = { userVisibleOnly: true };
        // Sc — cast explicite pour satisfaire le type applicationServerKey (string | ArrayBuffer | null)
        if (vapidKey) subscribeOptions.applicationServerKey = vapidKey.buffer as ArrayBuffer;

        const sub = await reg.pushManager.subscribe(subscribeOptions);
        const token = serializeSubscription(sub);
        if (!token) return;

        // 4. Récupérer l'ID de l'appareil enregistré puis POST /devices/:id/push-token
        const devices = await devicesApi.list();
        if (!devices?.length) return;

        // Utiliser le premier appareil (le plus récent) ou celui qui correspond
        const deviceId = devices[0]?.id;
        if (!deviceId) return;

        await devicesApi.registerPushToken(deviceId, token, "WEB");
        registered.current = true;
      } catch {
        // Silencieux — la subscription push est non bloquante
      }
    }

    subscribe();
  }, [isAuthenticated]);
}
