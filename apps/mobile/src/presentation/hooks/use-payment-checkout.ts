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
 * Flux Paystack WebView (doc officielle) :
 * - callback_url HTTP(S) = même endpoint que le web (/payment/callback)
 * - openAuthSessionAsync intercepte la redirection Paystack
 * - fallback openBrowserAsync si 3DS (standard.paystack.co/close) bloque l'intercept
 * - l'écran callback app poll + sync comme la page web
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
      const callbackParams: Record<string, string> = { reference: paymentId };
      if (simulationMode) callbackParams.sim = "1";
      if (returnTo) callbackParams.returnTo = returnTo;

      const paystackCallbackPrefix = getPaystackCallbackPrefix();

      goToAppCallback(callbackParams);

      if (simulationMode) return;
      if (!redirectUrl) return;

      const authResult = await WebBrowser.openAuthSessionAsync(
        redirectUrl,
        paystackCallbackPrefix,
      );

      if (authResult.type === "success" && authResult.url) {
        const parsed = parsePaystackReturnUrl(authResult.url);
        goToAppCallback({
          reference: parsed.reference ?? paymentId,
          ...(parsed.returnTo ?? returnTo ? { returnTo: parsed.returnTo ?? returnTo! } : {}),
          ...(parsed.sim ? { sim: "1" } : {}),
        });
        return;
      }

      // 3DS ou redirect non intercepté — navigateur classique, poll sur callback
      await WebBrowser.openBrowserAsync(redirectUrl);
    },
    [goToAppCallback],
  );

  return { openCheckout };
}
