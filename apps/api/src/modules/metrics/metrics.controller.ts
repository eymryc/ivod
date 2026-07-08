import { Controller, Get, Res } from '@nestjs/common';
import * as client from 'prom-client';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Contrôleur maison plutôt que le PrometheusController fourni par la lib :
 * avec @Res({ passthrough: true }), le TransformInterceptor global de l'API
 * (enveloppe { success, data, ... }) s'appliquait aussi ici et cassait le
 * format d'exposition Prometheus (texte brut attendu, pas du JSON). @Res()
 * SANS passthrough contourne entièrement la pipeline de réponse de Nest —
 * la réponse est envoyée manuellement, l'intercepteur n'a plus la main dessus.
 *
 * Pas de risque de sécurité à l'exposer sans JWT (@Public()) : le port 3000
 * de l'API n'a pas de mapping host (voir docker-compose.prod.yml), seul
 * Prometheus sur le réseau Docker interne y accède.
 */
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  async index(@Res() response: Response): Promise<void> {
    response.header('Content-Type', client.register.contentType);
    response.send(await client.register.metrics());
  }
}
