import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { VIDEO_QUEUE } from '../videos/video-pipeline.constants';
import { MetricsController } from './metrics.controller';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { QueueMetricsService } from './queue-metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      controller: MetricsController,
      defaultLabels: { app: 'ivod-api' },
    }),
    BullModule.registerQueue({ name: VIDEO_QUEUE }),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Nombre de requêtes HTTP traitées',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Durée des requêtes HTTP (secondes)',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeGaugeProvider({
      name: 'video_queue_jobs',
      help: 'Nombre de jobs BullMQ par état, file video-pipeline',
      labelNames: ['state'],
    }),
    QueueMetricsService,
  ],
})
export class MetricsModule {}
