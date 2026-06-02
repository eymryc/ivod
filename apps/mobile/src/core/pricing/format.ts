export function formatXOF(amount: number): string {
  return `${amount.toLocaleString("fr-CI")} FCFA`;
}

export function planPeriodLabel(billingDays: number): string {
  if (billingDays <= 1) return "24 heures";
  if (billingDays <= 7) return "7 jours";
  if (billingDays <= 30) return "30 jours";
  return `${billingDays} jours`;
}
