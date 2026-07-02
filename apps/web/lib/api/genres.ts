import { get } from "./client";

export interface Genre {
  id: string;
  code: string;
  label: string;
  slug: string;
  isActive?: boolean;
}

export const genresApi = {
  list: () => get<Genre[]>("/genres"),
};
