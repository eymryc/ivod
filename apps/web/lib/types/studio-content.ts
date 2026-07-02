export interface CreatorContentGenre {
  code: string;
  label: string;
}

export interface CreatorContentStats {
  totalViews: number;
  likeCount: number;
  commentCount: number;
  reviewCount: number;
  averageRating: number;
  favoriteCount: number;
}

export interface CreatorContentListItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  status: string;
  statusLabel?: string | null;
  contentType: string;
  contentTypeLabel?: string | null;
  visibility: string;
  visibilityLabel?: string | null;
  maturityRating?: string | null;
  maturityRatingLabel?: string | null;
  countryOfOrigin?: string | null;
  countryOfOriginLabel?: string | null;
  originalLanguage?: string | null;
  originalLanguageLabel?: string | null;
  genres: CreatorContentGenre[];
  posterObjectKey?: string | null;
  videoAssetId?: string | null;
  videoStatus?: string | null;
  videoDurationSec?: number | null;
  releaseYear?: number | null;
  duration?: number | null;
  isExclusive: boolean;
  ppvPrice?: number | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  averageRating: number;
  rejectionReason?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  episodeCount: number;
  seasonCount: number;
  stats?: CreatorContentStats | null;
}
