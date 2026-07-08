import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';
import { Queue, FlowProducer, Job } from 'bullmq';
import {
  VIDEO_QUEUE,
  VIDEO_JOB_TYPES,
  isTwoPhasePipelineEnabled,
} from './video-pipeline.constants';

export const VIDEO_FLOW_NAME = 'video-pipeline-flow';

const BASE_JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
} as const;

/** États BullMQ considérés "en vie" — un job dans un de ces états sera repris
 * normalement par le worker ; tout le reste (introuvable, ou état "unknown" —
 * hash Redis présent mais absent de toute liste suivie) est orphelin. */
const ALIVE_JOB_STATES = new Set(['active', 'waiting', 'delayed', 'waiting-children', 'prioritized']);

export interface EnqueueOpts {
  /** BullMQ priority: inférieur = plus prioritaire (1 = maximum). */
  priority?: number;
}

export type PackageMode = 'preview' | 'full';

@Injectable()
export class VideoPipelineService {
  private readonly logger = new Logger(VideoPipelineService.name);

  constructor(
    @InjectQueue(VIDEO_QUEUE) private readonly queue: Queue,
    @InjectFlowProducer(VIDEO_FLOW_NAME) private readonly flowProducer: FlowProducer,
  ) {}

  /**
   * Crée l'ensemble du pipeline atomiquement via FlowProducer.
   * Tous les jobs sont enregistrés en une seule opération Redis ;
   * un échec partiel ne laisse aucun job orphelin.
   *
   * Arbre d'exécution (deux phases) :
   *   PROBE → TRANSCODE_PREVIEW → PACKAGE(preview) → TRANSCODE_FULL → PACKAGE(full) → THUMBNAIL
   */
  async createPipelineFlow(assetId: string, opts?: EnqueueOpts): Promise<void> {
    // Sans ce nettoyage, un pipeline précédent interrompu (crash, redémarrage
    // worker) laisse ses jobs Redis en place sous les mêmes IDs déterministes
    // (probe_<assetId>, transcode_preview_<assetId>...) — flowProducer.add()
    // ci-dessous les retrouverait tels quels au lieu d'en créer de nouveaux,
    // et "relancer le pipeline" ne ferait alors silencieusement rien. Trouvé
    // le 2026-07-03 sur un asset interrompu par un déploiement.
    await this.removeExistingJobTree(assetId);

    const p = opts?.priority;
    // BullMQ interdit ':' dans les custom job IDs (délimiteur interne Redis)
    const o = (jobId: string) => ({ ...BASE_JOB_OPTIONS, jobId, priority: p });

    if (isTwoPhasePipelineEnabled()) {
      await this.flowProducer.add({
        name:      VIDEO_JOB_TYPES.THUMBNAIL,
        queueName: VIDEO_QUEUE,
        data:      { assetId },
        opts:      o(`thumbnail_${assetId}`),
        children:  [{
          name:      VIDEO_JOB_TYPES.PACKAGE,
          queueName: VIDEO_QUEUE,
          data:      { assetId, mode: 'full' as PackageMode },
          opts:      o(`package_${assetId}_full`),
          children:  [{
            name:      VIDEO_JOB_TYPES.TRANSCODE_FULL,
            queueName: VIDEO_QUEUE,
            data:      { assetId },
            opts:      o(`transcode_full_${assetId}`),
            children:  [{
              name:      VIDEO_JOB_TYPES.PACKAGE,
              queueName: VIDEO_QUEUE,
              data:      { assetId, mode: 'preview' as PackageMode },
              opts:      o(`package_${assetId}_preview`),
              children:  [{
                name:      VIDEO_JOB_TYPES.TRANSCODE_PREVIEW,
                queueName: VIDEO_QUEUE,
                data:      { assetId },
                opts:      o(`transcode_preview_${assetId}`),
                children:  [{
                  name:      VIDEO_JOB_TYPES.PROBE,
                  queueName: VIDEO_QUEUE,
                  data:      { assetId },
                  opts:      o(`probe_${assetId}`),
                }],
              }],
            }],
          }],
        }],
      });
    } else {
      // Pipeline monopasse (VIDEO_TWO_PHASE=false)
      await this.flowProducer.add({
        name:      VIDEO_JOB_TYPES.THUMBNAIL,
        queueName: VIDEO_QUEUE,
        data:      { assetId },
        opts:      o(`thumbnail_${assetId}`),
        children:  [{
          name:      VIDEO_JOB_TYPES.PACKAGE,
          queueName: VIDEO_QUEUE,
          data:      { assetId, mode: 'full' as PackageMode },
          opts:      o(`package_${assetId}_full`),
          children:  [{
            name:      VIDEO_JOB_TYPES.TRANSCODE,
            queueName: VIDEO_QUEUE,
            data:      { assetId },
            opts:      o(`transcode_${assetId}`),
            children:  [{
              name:      VIDEO_JOB_TYPES.PROBE,
              queueName: VIDEO_QUEUE,
              data:      { assetId },
              opts:      o(`probe_${assetId}`),
            }],
          }],
        }],
      });
    }
  }

  /** IDs déterministes possibles pour un asset, tous stades/modes confondus
   * (mono-passe et deux-phases) — un seul au plus est normalement pertinent
   * selon la config active, mais vérifier les deux ne coûte rien. */
  private candidateJobIds(assetId: string): string[] {
    return [
      `probe_${assetId}`,
      `transcode_${assetId}`,
      `transcode_preview_${assetId}`,
      `transcode_full_${assetId}`,
      `package_${assetId}_preview`,
      `package_${assetId}_full`,
      `thumbnail_${assetId}`,
    ];
  }

  /**
   * Un asset a-t-il un job BullMQ réellement suivi (actif, en attente, en
   * attente d'enfants...) ? Sert à détecter les pipelines orphelins : un job
   * dont le hash Redis existe mais qui n'est dans aucune liste suivie
   * (état "unknown" côté BullMQ) ne sera JAMAIS repris tout seul, même en
   * attendant indéfiniment — typiquement causé par une interruption du
   * worker (redéploiement) pendant qu'un job était actif. Trouvé le
   * 2026-07-07 sur plusieurs assets restés bloqués en TRANSCODING/PACKAGING
   * alors que toutes leurs renditions étaient déjà encodées avec succès.
   */
  async hasLiveJob(assetId: string): Promise<boolean> {
    for (const jobId of this.candidateJobIds(assetId)) {
      const job = await Job.fromId(this.queue, jobId);
      if (!job) continue;
      const state = await job.getState();
      if (ALIVE_JOB_STATES.has(state)) return true;
    }
    return false;
  }

  // ─── Méthodes individuelles (admin/retry — backward compat) ─────────────────

  async enqueueProbe(assetId: string, opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.PROBE,
      { assetId },
      { ...BASE_JOB_OPTIONS, jobId: `probe_${assetId}`, priority: opts?.priority },
    );
  }

  async enqueuePackage(assetId: string, mode: PackageMode = 'full', opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.PACKAGE,
      { assetId, mode },
      { ...BASE_JOB_OPTIONS, jobId: `package_${assetId}_${mode}`, priority: opts?.priority },
    );
  }

  async enqueueThumbnail(assetId: string, opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.THUMBNAIL,
      { assetId },
      { ...BASE_JOB_OPTIONS, jobId: `thumbnail_${assetId}`, priority: opts?.priority },
    );
  }

  /**
   * Supprime toute trace Redis (job hash, dépendances, verrous) d'un
   * pipeline précédent pour cet asset, avant d'en recréer un frais.
   *
   * Passe 1 — via l'API officielle BullMQ (`Job.remove()`) sur chacun des IDs
   * déterministes connus : contrairement à un DEL brut, elle sait retirer le
   * job de la liste/ZSET où il se trouve réellement (wait, active, delayed,
   * waiting-children...), pas seulement supprimer son hash. Un DEL brut sur
   * le hash seul, en laissant une référence orpheline dans une liste
   * suivie, est précisément le genre d'incohérence qui a laissé des jobs
   * PACKAGE parents invisibles du worker (trouvé le 2026-07-07).
   *
   * Passe 2 — SCAN+DEL de sécurité (gardé en filet) pour toute clé restante
   * ne correspondant à aucun des IDs déterministes ci-dessus (peu probable
   * mais pas exclu — dépendances de flow, entrées `:processed`...).
   */
  private async removeExistingJobTree(assetId: string): Promise<void> {
    for (const jobId of this.candidateJobIds(assetId)) {
      try {
        const job = await Job.fromId(this.queue, jobId);
        if (job) await job.remove({ removeChildren: true });
      } catch (err) {
        this.logger.warn(`removeExistingJobTree: Job.remove(${jobId}) — ${(err as Error).message}`);
      }
    }

    const client = await this.queue.client;
    const prefix = `bull:${VIDEO_QUEUE}:`;
    const pattern = `${prefix}*${assetId}*`;

    const keys: string[] = [];
    let cursor: string | number = '0';
    do {
      const [next, batch] = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
