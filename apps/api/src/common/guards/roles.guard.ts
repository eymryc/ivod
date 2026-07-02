import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    const userRoles: string[] = Array.isArray(user.roles) && user.roles.length
      ? user.roles
      : [user.role].filter(Boolean);

    // SUPER_ADMIN bypasse toutes les vérifications de rôle
    if (userRoles.includes('SUPER_ADMIN')) return true;

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
