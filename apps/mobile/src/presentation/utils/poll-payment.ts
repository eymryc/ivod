import { paymentsApi } from "@/infrastructure/api";
import { isPaymentCompleted, isPaymentFailed } from "@/presentation/utils/payment-status";

export type PollPaymentOptions = {
  paymentId: string;
  intervalMs?: number;
  maxAttempts?: number;
  onCompleted?: () => void;
  onFailed?: () => void;
};

/** Poll Paystack payment status — aligné sur le web (sync au 1er essai, puis getOne). */
export function pollPaymentStatus({
  paymentId,
  intervalMs = 5000,
  maxAttempts = 24,
  onCompleted,
  onFailed,
}: PollPaymentOptions): () => void {
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    try {
      if (attempts === 1) {
        try {
          await paymentsApi.syncPayment(paymentId);
        } catch {
          /* webhook peut avoir déjà finalisé */
        }
      }
      const payment = await paymentsApi.getOne(paymentId);
      if (isPaymentCompleted((payment as { status?: unknown }).status)) {
        clearInterval(interval);
        onCompleted?.();
      } else if (
        isPaymentFailed((payment as { status?: unknown }).status) ||
        attempts >= maxAttempts
      ) {
        clearInterval(interval);
        onFailed?.();
      }
    } catch {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        onFailed?.();
      }
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
