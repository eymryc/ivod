/** Plans payants donnant accès SVOD (contenus SUBSCRIBERS_ONLY). */
export const PAID_SVOD_PLAN_CODES = ['PASS_24H', 'PASS_WEEK', 'PREMIUM', 'BASIC'] as const;

export type PaidSvodPlanCode = (typeof PAID_SVOD_PLAN_CODES)[number];

export function isPaidSvodPlan(code: string | null | undefined): boolean {
  return !!code && (PAID_SVOD_PLAN_CODES as readonly string[]).includes(code);
}

/** Plans proposés à l'achat (boutique). */
export const STORE_PLAN_CODES = ['PASS_24H', 'PASS_WEEK', 'PREMIUM'] as const;
