/**
 * Service Device — Enregistrement de l'appareil et gestion du fingerprint.
 *
 * Responsabilités :
 * - Générer et persister un fingerprint stable par appareil
 * - Enregistrer l'appareil courant côté API au login
 * - Associer le token push à l'appareil enregistré
 *
 * Le fingerprint est stable entre les sessions mais unique par installation.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { deviceApi } from '../api/modules/device.api';
import { notificationService } from './notification.service';

const DEVICE_ID_KEY = 'ivod_registered_device_id';
const FINGERPRINT_KEY = 'ivod_device_fingerprint';

// ─── Fingerprint ───────────────────────────────────────────────────────────

/**
 * Retourne le fingerprint de l'appareil, en le générant s'il n'existe pas encore.
 * Le fingerprint est basé sur OS + modèle + timestamp de première installation.
 */
export async function ensureDeviceFingerprint(): Promise<string> {
  let fp = await AsyncStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = `${Platform.OS}-${Device.modelName ?? 'device'}-${Date.now()}`;
    await AsyncStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

/** Récupère l'ID de l'appareil enregistré côté API (si déjà enregistré). */
export async function getStoredDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(DEVICE_ID_KEY);
}

// ─── Enregistrement ────────────────────────────────────────────────────────

/**
 * Enregistre l'appareil courant côté API et associe le token push.
 *
 * Cette fonction est appelée silencieusement au login.
 * Les erreurs sont loguées mais ne bloquent pas l'authentification.
 */
export async function registerDeviceOnLogin(): Promise<void> {
  try {
    const fingerprint = await ensureDeviceFingerprint();
    const device = await deviceApi.register({
      deviceType: 'MOBILE',
      deviceName: Device.modelName ?? undefined,
      os: Device.osName ?? Platform.OS,
      osVersion: Device.osVersion ?? undefined,
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
      fingerprint,
    });

    await AsyncStorage.setItem(DEVICE_ID_KEY, device.id);
    await notificationService.registerPushTokenForDevice(device.id);
  } catch (e) {
    // L'échec d'enregistrement n'est pas bloquant pour l'UX
    console.warn('[DeviceService] Échec enregistrement appareil', e);
  }
}
