export type SearchSuggestion = {
  id: string;
  title: string;
  slug?: string;
  type: string;
  contentTypeLabel?: string | null;
  releaseYear?: number | null;
  duration?: number | null;
  shortDescription?: string | null;
  creatorName?: string | null;
  genres?: string[];
  thumbnailObjectKey?: string | null;
  mediaAssets?: Array<{ objectKey: string; type?: { code: string }; isPrimary?: boolean }>;
  avatarObjectKey?: string | null;
  verified?: boolean;
};
