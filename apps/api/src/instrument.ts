// Doit être importé en PREMIER dans main.ts (avant tout autre import NestJS)
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Ne pas capturer les erreurs 4xx côté client
    beforeSend(event) {
      const status = (event.contexts?.response as any)?.status_code;
      if (status && status < 500) return null;
      return event;
    },
  });
}
