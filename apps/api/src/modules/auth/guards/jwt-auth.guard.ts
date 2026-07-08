import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  // Sans ceci, Passport lève un UnauthorizedException sans body personnalisé,
  // et le GlobalExceptionFilter retombe sur son message anglais par défaut
  // ("Unauthorized") — la seule route de l'API qui échappait au français.
  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({ code: 'AUTH_009', message: 'Authentification requise' });
    }
    return user;
  }
}
