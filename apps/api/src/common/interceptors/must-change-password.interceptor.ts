import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

type AuthedRequest = Request & { user?: { mustChangePassword?: boolean } };

/**
 * Après authentification JWT : bloque toute requête si mustChangePassword, sauf
 * lecture du profil (GET /users/me) et changement de mot de passe.
 */
@Injectable()
export class MustChangePasswordInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user;
    if (!user || user.mustChangePassword !== true) {
      return next.handle();
    }

    const method = req.method;
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];

    if (method === 'GET' && path.endsWith('/users/me')) return next.handle();
    if (method === 'POST' && path.endsWith('/auth/change-password')) return next.handle();
    if (method === 'POST' && path.endsWith('/auth/setup-password')) return next.handle();

    throw new ForbiddenException({
      code: 'AUTH_012',
      message: 'Vous devez d’abord définir un nouveau mot de passe (compte créé par un administrateur).',
    });
  }
}
