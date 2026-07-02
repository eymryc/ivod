/**
 * Service Notifications — Gestion des permissions et tokens push.
 *
 * Responsabilités :
 * - Configurer le gestionnaire de notifications Expo (une seule fois au démarrage)
 * - Demander les permissions push
 * - Obtenir et transmettre le token push Expo à l'API
 *
 * Ce service est initialisé au montage de l'app et ne requiert
 * aucune interaction utilisateur immédiate.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { deviceApi } from '../api/modules/device.api';

// ─── Configuration globale ─────────────────────────────────────────────────

/**
 * Configure le comportement d'affichage des notifications reçues
 * pendant que l'app est au premier plan.
 * À appeler UNE SEULE fois, au plus tôt dans le cycle de vie de l'app.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Utilitaires internes ──────────────────────────────────────────────────

/**
 * Récupère le token push Expo, en utilisant le projectId EAS si disponible.
 * Retourne null si l'obtention échoue (appareil simulateur, etc.).
 */
async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch {
    return null;
  }
}

// ─── Interface publique ────────────────────────────────────────────────────

export const notificationService = {
  /**
   * Demande les permissions push et enregistre le token auprès de l'API.
   * Appelé après l'enregistrement de l'appareil, silencieux en cas d'échec.
   */
  registerPushTokenForDevice: async (deviceId: string): Promise<void> => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const token = await getExpoPushToken();
    if (!token) return;

    try {
      const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      await deviceApi.registerPushToken(deviceId, token, platform);
    } catch (e) {
      console.warn('[NotificationService] Échec enregistrement token push', e);
    }
  },
};
