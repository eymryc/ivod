import type { AuthUser } from '@/core/entities';

/** ADMIN ou SUPER_ADMIN — parité web isAdmin(). */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const roles = (user as { roles?: string[] }).roles;
  if (roles?.includes('ADMIN') || roles?.includes('SUPER_ADMIN')) return true;
  const role = user.role?.toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}
