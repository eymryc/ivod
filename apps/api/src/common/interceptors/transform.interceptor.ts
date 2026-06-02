import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@/common/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{ method?: string }>();
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

        return {
        success: true,
        data: normalizedData ?? null,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
          ...(data?.meta ?? {}),
        },
      };
      }),
    );
  }
}
