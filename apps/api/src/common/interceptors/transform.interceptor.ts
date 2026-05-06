import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@ivod/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private toJsonSafe(value: unknown): unknown {
    if (value == null) return value;
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue: unknown) => {
        if (typeof nestedValue === 'bigint') {
          return nestedValue.toString();
        }
        return nestedValue;
      }),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string }>();
    const pathHint = request?.originalUrl ?? request?.url ?? '';
    if (pathHint.includes('/videos/hls-proxy/')) {
      return next.handle() as Observable<ApiResponse<T>>;
    }
    const method = request?.method ?? 'GET';

    const defaultSuccessMessageByMethod: Record<string, string | undefined> = {
      GET: undefined,
      POST: 'Operation effectuee avec succes',
      PUT: 'Mise a jour effectuee avec succes',
      PATCH: 'Mise a jour effectuee avec succes',
      DELETE: 'Suppression effectuee avec succes',
    };

    return next.handle().pipe(
      map((data) => {
        const defaultMessage = defaultSuccessMessageByMethod[method];
        const hasObjectPayload = !!data && typeof data === 'object' && !Array.isArray(data);
        const hasMessage = hasObjectPayload && Object.prototype.hasOwnProperty.call(data as object, 'message');
        const normalizedData =
          hasObjectPayload && defaultMessage && !hasMessage
            ? ({ ...(data as Record<string, unknown>), message: defaultMessage } as T)
            : data;
        const safeData = this.toJsonSafe(normalizedData) as T;
        const safeMeta =
          safeData && typeof safeData === 'object' && 'meta' in (safeData as Record<string, unknown>)
            ? ((safeData as Record<string, unknown>).meta as Record<string, unknown>)
            : {};

        return {
          success: true,
          data: safeData ?? null,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            version: 'v1',
            ...safeMeta,
          },
        };
      }),
    );
  }
}
