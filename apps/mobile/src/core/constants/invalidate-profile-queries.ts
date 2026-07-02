import type { QueryClient } from '@tanstack/react-query';

/** Invalide toutes les queries liées au profil actif (changement de profil). */
export function invalidateProfileScopedQueries(qc: QueryClient) {
  const tasks = [
    qc.invalidateQueries({ queryKey: ['favorites'] }),
    qc.invalidateQueries({ queryKey: ['favorites-rails'] }),
    qc.invalidateQueries({ queryKey: ['watch'] }),
    qc.invalidateQueries({ queryKey: ['watch-history-rails'] }),
    qc.invalidateQueries({ queryKey: ['watch-history-home'] }),
    qc.invalidateQueries({ queryKey: ['watch-history-catalog'] }),
    qc.invalidateQueries({ queryKey: ['watch-history-item'] }),
    qc.invalidateQueries({ queryKey: ['history'] }),
    qc.invalidateQueries({ queryKey: ['recommendations'] }),
    qc.invalidateQueries({ queryKey: ['recommendations-rails'] }),
    qc.invalidateQueries({ queryKey: ['like'] }),
    qc.invalidateQueries({ queryKey: ['content'] }),
    qc.invalidateQueries({ queryKey: ['parental'] }),
    qc.invalidateQueries({ queryKey: ['profiles'] }),
  ];
  return Promise.all(tasks);
}
