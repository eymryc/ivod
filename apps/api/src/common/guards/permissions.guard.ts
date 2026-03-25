import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions: string[] = user?.permissions ?? [];
    if (userPermissions.includes('*')) return true;

    const allowed = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
    if (!allowed) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Permissions insuffisantes' });
    }
    return true;
  }
}
