import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.TEST_MODE === 'true') return true;
    return super.canActivate(context);
  }

  // Sans ceci, @nestjs/throttler lève "ThrottlerException: Too Many Requests"
  // (anglais, sans code) à la place du format {code, message} du reste de l'API.
  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Trop de requêtes — veuillez réessayer dans un instant.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
