import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram } from 'prom-client';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Route "gabarit" (ex. /contents/:id) plutôt que l'URL brute — évite
 * l'explosion de cardinalité Prometheus avec un label par ID de contenu.
 */
function routeLabel(req: Request): string {
  const route = (req as { route?: { path?: string } }).route?.path;
  if (route) return `${req.baseUrl ?? ''}${route}`;
  return 'unmatched';
}

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total') private readonly requestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const start = process.hrtime.bigint();

    const record = () => {
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        method: req.method,
        route: routeLabel(req),
        status_code: String(res.statusCode),
      };
      this.requestsTotal.inc(labels);
      this.requestDuration.observe(labels, durationSec);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
