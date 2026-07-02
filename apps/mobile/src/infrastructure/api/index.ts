/**
 * Point d'entrée public de l'infrastructure API.
 *
 * Exporte tous les modules API + le client HTTP et ses utilitaires.
 * Importer depuis ici pour rester indépendant de la structure interne.
 */
export { api, buildQueryString, getAccessToken, setTokens, clearTokens } from './client';
export type { AuthMode } from './client';

export { authApi } from './modules/auth.api';
export { contentApi } from './modules/content.api';
export { videoApi } from './modules/video.api';
export { profileApi } from './modules/profile.api';
export { watchApi } from './modules/watch.api';
export { favoriteApi } from './modules/favorite.api';
export { downloadApi } from './modules/download.api';
export { searchApi } from './modules/search.api';
export { adApi } from './modules/ad.api';
export { creatorApi } from './modules/creator.api';
export { followApi } from './modules/follow.api';
export { reviewApi } from './modules/review.api';
export { commentApi } from './modules/comment.api';
export { notificationApi } from './modules/notification.api';
export { deviceApi } from './modules/device.api';
export { subscriptionApi } from './modules/subscription.api';
export { peopleApi } from './modules/people.api';
export { awardApi } from './modules/award.api';
export { bannerApi } from './modules/banner.api';
export { recommendationApi } from './modules/recommendation.api';
export { reportApi } from './modules/report.api';
export { paymentApi } from './modules/payment.api';
export { likeApi } from './modules/like.api';
export { userApi } from './modules/user.api';
export { promoApi } from './modules/promo.api';
export { referencesApi } from './modules/references.api';
export { homeApi } from './modules/home.api';
export { catalogApi } from './modules/catalog.api';
export type { HomeSection, HomeSectionType, CatalogQuerySection, HomeConfig } from './modules/home.api';
export type { CatalogRail, CatalogRailSurface } from './modules/catalog.api';

// ── Aliases pluriels (compatibilité avec l'ancien lib/api/endpoints.ts) ────
export { userApi as usersApi } from './modules/user.api';
export { profileApi as profilesApi } from './modules/profile.api';
export { contentApi as contentsApi } from './modules/content.api';
export { videoApi as videosApi } from './modules/video.api';
export { favoriteApi as favoritesApi } from './modules/favorite.api';
export { followApi as followsApi } from './modules/follow.api';
export { downloadApi as downloadsApi } from './modules/download.api';
export { subscriptionApi as subscriptionsApi } from './modules/subscription.api';
export { paymentApi as paymentsApi } from './modules/payment.api';
export { notificationApi as notificationsApi } from './modules/notification.api';
export { deviceApi as devicesApi } from './modules/device.api';
export { creatorApi as creatorsApi } from './modules/creator.api';
export { reportApi as reportsApi } from './modules/report.api';
export { reviewApi as reviewsApi } from './modules/review.api';
export { commentApi as commentsApi } from './modules/comment.api';
export { awardApi as awardsApi } from './modules/award.api';
export { bannerApi as bannersApi } from './modules/banner.api';
export { recommendationApi as recommendationsApi } from './modules/recommendation.api';

// Types des modules
export type { ContentListParams } from './modules/content.api';
export type { StreamInfo } from './modules/video.api';
export type { FavoriteStatus, FavoriteListResult } from './modules/favorite.api';
export type { DownloadRegistration } from './modules/download.api';
export type { SearchParams, SearchResult } from './modules/search.api';
export type { FollowStatus } from './modules/follow.api';
export type { Review, ReviewListResult } from './modules/review.api';
export type { Comment, CommentListResult } from './modules/comment.api';
export type { Notification } from './modules/notification.api';
export type { RegisteredDevice } from './modules/device.api';
export type { SubscriptionPlan, ActiveSubscription } from './modules/subscription.api';
export type { Person } from './modules/people.api';
export type { Award } from './modules/award.api';
export type { Banner } from './modules/banner.api';
export type { WatchHistoryResult } from './modules/watch.api';
