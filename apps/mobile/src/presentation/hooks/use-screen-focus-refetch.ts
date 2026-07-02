import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Refetch les queries actives quand l'écran reprend le focus (navigation onglets / retour stack).
 */
export function useScreenFocusRefetch(queryKeys: readonly QueryKey[]) {
  const qc = useQueryClient();
  const keysRef = useRef(queryKeys);
  keysRef.current = queryKeys;

  useFocusEffect(
    useCallback(() => {
      for (const queryKey of keysRef.current) {
        void qc.invalidateQueries({ queryKey, refetchType: 'active' });
      }
    }, [qc]),
  );
}
