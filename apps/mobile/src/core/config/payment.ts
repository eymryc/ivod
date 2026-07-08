import * as Linking from "expo-linking";

/**
 * URL de callback paiement — alignée web (HTTPS/HTTP accessible depuis le téléphone).
 *
 * Le prestataire de paiement exige une callback_url HTTP(S) et redirige le navigateur vers cette URL
 * après paiement (cf. guide WebView). On intercepte cette URL via openAuthSessionAsync.
 *
 * En dev sur appareil physique : EXPO_PUBLIC_WEB_URL=http://<IP-LAN-Mac>:3001
 * (même machine que le Next.js local, accessible depuis le téléphone).
 */
export function getPaymentWebOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "http://localhost:3001";
}

/** Préfixe intercepté par openAuthSessionAsync (sans query). */
export function getPaystackCallbackPrefix(): string {
  return `${getPaymentWebOrigin()}/payment/callback`;
}

type CallbackOpts = { returnTo?: string; sim?: boolean; mobile?: boolean };

/**
 * Deep link de retour dans l'app (Expo Go : exp://…, build natif : ivod://…).
 * Passé à la page web /payment/callback pour rouvrir l'app après le paiement.
 */
export function getAppPaymentReturnUrl(): string {
  return Linking.createURL("/payment/callback");
}

/** URL envoyée à l'API comme callback_url (l'API ajoute reference=). */
export function buildPaystackCallbackBase(opts?: CallbackOpts): string {
  const params = new URLSearchParams();
  params.set("mobile", "1");
  params.set("appReturn", getAppPaymentReturnUrl());
  if (opts?.returnTo) params.set("returnTo", opts.returnTo);
  if (opts?.sim) params.set("sim", "1");
  const q = params.toString();
  return `${getPaystackCallbackPrefix()}${q ? `?${q}` : ""}`;
}

/** URL complète avec référence (logs / debug). */
export function buildPaystackCallbackUrl(paymentId: string, opts?: CallbackOpts): string {
  const params = new URLSearchParams();
  params.set("reference", paymentId);
  params.set("mobile", "1");
  if (opts?.returnTo) params.set("returnTo", opts.returnTo);
  if (opts?.sim) params.set("sim", "1");
  return `${getPaystackCallbackPrefix()}?${params.toString()}`;
}

/** Extrait reference / returnTo depuis l'URL de retour. */
export function parsePaystackReturnUrl(url: string): {
  reference?: string;
  returnTo?: string;
  sim?: boolean;
} {
  try {
    const parsed = new URL(url);
    return {
      reference:
        parsed.searchParams.get("reference") ??
        parsed.searchParams.get("trxref") ??
        undefined,
      returnTo: parsed.searchParams.get("returnTo") ?? undefined,
      sim: parsed.searchParams.get("sim") === "1",
    };
  } catch {
    return {};
  }
}
