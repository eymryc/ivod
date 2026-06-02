export {
  getOfflineItems,
  getOfflineByContentId,
  removeOfflineItem,
  downloadContentOffline,
} from './offline.service';

export { getOfflineBadgeLabel as offlineBadgeLabel } from '@/core/entities';

export type { OfflineItem } from '@/core/entities';
