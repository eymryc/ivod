import { api } from '../client';

export const referencesApi = {
  listContentTypes: (): Promise<unknown[]> =>
    api.get<unknown[]>('/content-types', 'optional'),

  listAll: (): Promise<unknown> =>
    api.get<unknown>('/references', 'optional'),
};
