import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { WorkerAppModule } from './worker-app.module';
import { createAppLogger } from './common/logger/winston.logger';
import {
  resolveWorkerConcurrency,
  resolveJobLockDuration,
  resolveJobLockRenewTime,
} from './modules/videos/video-pipeline.constants';

async function bootstrap() {
  const logger = createAppLogger();
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  const concurrency = resolveWorkerConcurrency();
  const lockMs = resolveJobLockDuration();
  const lockRenewMs = resolveJobLockRenewTime(lockMs);
  logger.info(
    `iVOD video worker démarré (concurrency=${concurrency}, queue=video-pipeline, lock=${lockMs}ms renew=${lockRenewMs}ms)`,
  );

  await app.init();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM — arrêt du worker vidéo');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Video worker failed to start:', err);
  process.exit(1);
});
