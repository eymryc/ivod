import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Same as JwtAuthGuard but does not throw when there's no/invalid token.
 * It enables public endpoints to "upgrade" to authenticated behavior when a JWT is provided.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any) {
    if (err) return null;
    return user ?? null;
  }
}

