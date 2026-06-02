/** Rôles plateforme avec accès staff (modération, lecture preview, etc.) */
export const STAFF_ROLE_CODES = ['ADMIN', 'SUPER_ADMIN'] as const;

export type StaffRoleCode = (typeof STAFF_ROLE_CODES)[number];

export function hasStaffRole(roles: string[] | undefined | null): boolean {
  if (!roles?.length) return false;
  return roles.some((code) => (STAFF_ROLE_CODES as readonly string[]).includes(code));
}
