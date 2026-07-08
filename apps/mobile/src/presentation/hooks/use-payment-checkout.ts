import { useCallback } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  getPaystackCallbackPrefix,
  parsePaystackReturnUrl,
} from "@/core/config/payment";

export type CheckoutParams = {
  paymentId: string;
  redirectUrl?: string | null;
  simulationMode?: boolean;
  returnTo?: string;
};

/**
 * Flux paiement mobile (doc officielle) :
 * - Initialiser côté serveur → authorization_url
 * - callback_url HTTP(S) interceptée par openAuthSessionAsync
 * - Vérifier via POST /payments/:id/sync après retour (jamais avant le checkout)
 * - Fallback openBrowserAsync : la page web /payment/callback?mobile=1 rouvre l'app
 *
 * @see https://paystack.com/docs/payments/accept-payments/
 * @see https://paystack.com/docs/payments/verify-payments/
 */
export function usePaymentCheckout() {
  const router = useRouter();

  const goToAppCallback = useCallback(
    (params: Record<string, string>) => {
      router.replace({
        pathname: "/payment/callback",
        params,
      });
    },
    [router],
  );

  const openCheckout = useCallback(
    async ({ paymentId, redirectUrl, simulationMode, returnTo }: CheckoutParams) => {
      const callbackParams: Record<string, string> = { paymentId };
      if (simulationMode) callbackParams.sim = "1";
      if (returnTo) callbackParams.returnTo = returnTo;

      if (simulationMode) {
        goToAppCallback(callbackParams);
        return;
      }

      if (!redirectUrl) return;

      const paystackCallbackPrefix = getPaystackCallbackPrefix();

      const authResult = await WebBrowser.openAuthSessionAsync(
        redirectUrl,
        paystackCallbackPrefix,
      );

      WebBrowser.maybeCompleteAuthSession();

      if (authResult.type === "success" && authResult.url) {
        const parsed = parsePaystackReturnUrl(authResult.url);
        goToAppCallback({
          paymentId,
          ...(parsed.returnTo ?? returnTo ? { returnTo: parsed.returnTo ?? returnTo! } : {}),
        });
        return;
      }

      // iOS ferme parfois la session sans URL après paiement — reprendre dans l'app
      if (authResult.type === "cancel" || authResult.type === "dismiss") {
        goToAppCallback({ ...callbackParams, browser: "1" });
        return;
      }

      // Navigateur système (Expo Go, 3DS…) : ouvrir l'écran callback AVANT le navigateur
      // pour que la fermeture manuelle (×) ramène directement à la vérification.
      goToAppCallback({ ...callbackParams, browser: "1" });
      await WebBrowser.openBrowserAsync(redirectUrl, {
        showInRecents: true,
      });
    },
    [goToAppCallback],
  );

  return { openCheckout };
}
