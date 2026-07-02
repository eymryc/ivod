import {
  DispatchNotificationInput,
  NotificationType,
  VideoNotificationData,
} from '@/common/types';

export interface VideoNotificationContext {
  userId: string;
  contentId: string;
  assetId: string;
  episodeId: string | null;
  contentTitle: string;
  episodeLabel?: string;
  errorMessage?: string;
}

function videoData(ctx: VideoNotificationContext): VideoNotificationData {
  return {
    contentId: ctx.contentId,
    assetId: ctx.assetId,
    episodeId: ctx.episodeId,
    contentTitle: ctx.contentTitle,
    episodeLabel: ctx.episodeLabel,
  };
}

function videoTitle(ctx: VideoNotificationContext): string {
  if (ctx.episodeLabel) return `${ctx.contentTitle} — ${ctx.episodeLabel}`;
  return ctx.contentTitle;
}

export function buildVideoPreviewReady(
  ctx: VideoNotificationContext,
): DispatchNotificationInput<typeof NotificationType.VIDEO_PREVIEW_READY> {
  const label = videoTitle(ctx);
  return {
    userId: ctx.userId,
    type: NotificationType.VIDEO_PREVIEW_READY,
    title: 'Aperçu disponible',
    body: `La lecture de « ${label} » est prête. L'encodage des autres qualités continue.`,
    data: videoData(ctx),
  };
}

export function buildVideoReady(
  ctx: VideoNotificationContext,
): DispatchNotificationInput<typeof NotificationType.VIDEO_READY> {
  const label = videoTitle(ctx);
  return {
    userId: ctx.userId,
    type: NotificationType.VIDEO_READY,
    title: 'Vidéo prête',
    body: `« ${label} » a été traitée et est prête à être publiée.`,
    data: videoData(ctx),
  };
}

export function buildVideoFailed(
  ctx: VideoNotificationContext,
): DispatchNotificationInput<typeof NotificationType.VIDEO_FAILED> {
  const label = videoTitle(ctx);
  return {
    userId: ctx.userId,
    type: NotificationType.VIDEO_FAILED,
    title: 'Échec du traitement vidéo',
    body: ctx.errorMessage
      ? `Le traitement de « ${label} » a échoué : ${ctx.errorMessage}`
      : `Le traitement de « ${label} » a échoué.`,
    data: { ...videoData(ctx), errorMessage: ctx.errorMessage },
  };
}
