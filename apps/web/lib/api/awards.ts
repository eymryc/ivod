import { get, post, del } from "./client";

export type ContentAwardRow = {
  contentId: string;
  awardId: string;
  won: boolean;
  award: {
    id: string;
    name: string;
    category?: string | null;
    year?: number | null;
    type?: { code: string; label: string } | null;
  };
};

export type ContentAwardView = {
  id: string;
  name: string;
  category?: string | null;
  year?: number | null;
  isWinner: boolean;
  awardType?: { code?: string; label: string } | null;
};

function mapAwards(rows: ContentAwardRow[]): ContentAwardView[] {
  return rows.map((ca) => ({
    id: ca.award.id,
    name: ca.award.name,
    category: ca.award.category,
    year: ca.award.year,
    isWinner: ca.won,
    awardType: ca.award.type
      ? { code: ca.award.type.code, label: ca.award.type.label }
      : null,
  }));
}

export const awardsApi = {
  listForContent: async (contentId: string): Promise<ContentAwardView[]> => {
    const rows = await get<ContentAwardRow[]>(`/awards/contents/${contentId}`, true);
    return mapAwards(Array.isArray(rows) ? rows : []);
  },

  create: (data: {
    typeCode: string;
    name: string;
    category?: string;
    year?: number;
  }) => post<{ id: string }>("/awards", data),

  linkToContent: (contentId: string, awardId: string, won = true) =>
    post(`/awards/contents/${contentId}`, { awardId, won }),

  unlink: (contentId: string, awardId: string) =>
    del(`/awards/contents/${contentId}/${awardId}`),

  /** Crée le prix puis l'associe au contenu (flux studio) */
  addToContent: async (
    contentId: string,
    data: {
      name: string;
      category?: string;
      year: number;
      typeCode: string;
      isWinner: boolean;
    },
  ) => {
    const award = await awardsApi.create({
      typeCode: data.typeCode,
      name: data.name,
      category: data.category,
      year: data.year,
    });
    return awardsApi.linkToContent(contentId, award.id, data.isWinner);
  },
};
