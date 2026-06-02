/**
 * Fabrique de clés React Query.
 *
 * Centralise toutes les query keys pour éviter les fautes de frappe,
 * permettre l'invalidation ciblée et documenter les dépendances entre queries.
 *
 * Pattern : tableau hiérarchique [domaine, sous-domaine?, id?, params?]
 *
 * @example
 *   queryClient.invalidateQueries({ queryKey: QueryKeys.content.detail(id) });
 */
export const QueryKeys = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  // ── Profils ───────────────────────────────────────────────────────────────
  profiles: {
    all: () => ['profiles'] as const,
    parental: (profileId: string) => ['profiles', profileId, 'parental'] as const,
  },

  // ── Contenus ─────────────────────────────────────────────────────────────
  content: {
    all: () => ['content'] as const,
    lists: () => ['content', 'list'] as const,
    list: (params: Record<string, unknown>) => ['content', 'list', params] as const,
    detail: (id: string, profileId?: string | null) =>
      ['content', id, profileId ?? 'no-profile'] as const,
    entitlement: (id: string, profileId?: string | null) =>
      ['content', id, 'entitlement', profileId ?? 'no-profile'] as const,
    /** Prefix key — invalidates all entitlement queries for a content regardless of profile. */
    entitlementPrefix: (id: string) => ['content', id, 'entitlement'] as const,
    seasons: (contentId: string) => ['content', contentId, 'seasons'] as const,
    similar: (contentId: string, genre?: string, type?: string) =>
      ['similar', contentId, genre, type] as const,
  },

  // ── Stream ────────────────────────────────────────────────────────────────
  stream: {
    content: (id: string, episodeId?: string) =>
      ['stream', id, episodeId ?? 'no-episode'] as const,
    promo: (id: string) => ['promo-stream', id] as const,
  },

  // ── Catalogue ─────────────────────────────────────────────────────────────
  catalog: {
    section: (id: string, type?: string) => ['catalog', id, type ?? 'all'] as const,
  },

  // ── Likes ─────────────────────────────────────────────────────────────────
  likes: {
    status: (contentId: string, profileId?: string | null) =>
      ['like', contentId, profileId ?? 'no-profile'] as const,
  },

  // ── Références ────────────────────────────────────────────────────────────
  references: {
    contentTypes: () => ['content-types'] as const,
  },

  // ── Favoris ───────────────────────────────────────────────────────────────
  favorites: {
    list: (profileId?: string | null) => ['favorites', profileId ?? 'no-profile'] as const,
    status: (contentId: string, profileId?: string | null) =>
      ['favorites', 'status', contentId, profileId ?? 'no-profile'] as const,
  },

  // ── Téléchargements ───────────────────────────────────────────────────────
  downloads: {
    list: () => ['downloads'] as const,
  },

  // ── Historique ────────────────────────────────────────────────────────────
  watch: {
    history: (profileId?: string | null) =>
      ['watch', 'history', profileId ?? 'no-profile'] as const,
  },

  // ── Recherche ─────────────────────────────────────────────────────────────
  search: {
    results: (query: string) => ['search', query] as const,
    trending: (period: string) => ['search', 'trending', period] as const,
  },

  // ── Abonnement ────────────────────────────────────────────────────────────
  subscription: {
    plans: () => ['subscription', 'plans'] as const,
    active: () => ['subscription', 'me'] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list: () => ['notifications'] as const,
  },

  // ── Créateurs ─────────────────────────────────────────────────────────────
  creators: {
    detail: (id: string) => ['creator', id] as const,
    contents: (id: string) => ['creator', id, 'contents'] as const,
    followStatus: (id: string) => ['creator', id, 'follow-status'] as const,
  },

  // ── Personnes (cast/crew) ─────────────────────────────────────────────────
  people: {
    detail: (id: string) => ['person', id] as const,
    cast: (contentId: string) => ['people', 'cast', contentId] as const,
    crew: (contentId: string) => ['people', 'crew', contentId] as const,
  },

  // ── Avis & Commentaires ───────────────────────────────────────────────────
  reviews: {
    list: (contentId: string) => ['reviews', contentId] as const,
  },
  comments: {
    list: (contentId: string) => ['comments', contentId] as const,
  },

  // ── Récompenses ───────────────────────────────────────────────────────────
  awards: {
    list: (contentId: string) => ['awards', contentId] as const,
  },

  // ── Recommandations ───────────────────────────────────────────────────────
  recommendations: {
    list: (profileId?: string | null) =>
      ['recommendations', profileId ?? 'no-profile'] as const,
  },

  // ── Live ──────────────────────────────────────────────────────────────────
  live: {
    list: () => ['live'] as const,
    detail: (id: string) => ['live', id] as const,
  },

  // ── Appareils ─────────────────────────────────────────────────────────────
  devices: {
    list: () => ['devices'] as const,
    loginHistory: () => ['devices', 'login-history'] as const,
  },

  // ── Paiements ─────────────────────────────────────────────────────────────
  payments: {
    list: () => ['payments'] as const,
    config: (provider: string) => ['payments', 'config', provider] as const,
  },

  // ── Banners ───────────────────────────────────────────────────────────────
  banners: {
    list: (country: string, plan: string) => ['banners', country, plan] as const,
  },
} as const;
