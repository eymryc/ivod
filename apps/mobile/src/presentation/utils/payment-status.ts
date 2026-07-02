export function paymentStatusCode(status: unknown): string {
  if (status == null) return "PENDING";
  if (typeof status === "string") return status;
  if (typeof status === "object" && status !== null && "code" in status) {
    return String((status as { code?: string }).code ?? "PENDING");
  }
  return "PENDING";
}

export function isPaymentCompleted(status: unknown): boolean {
  return paymentStatusCode(status) === "COMPLETED";
}

export function isPaymentFailed(status: unknown): boolean {
  return paymentStatusCode(status) === "FAILED";
}
