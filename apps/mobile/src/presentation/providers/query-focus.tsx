/**
 * Branche le focusManager TanStack Query sur AppState (équivalent mobile de refetchOnWindowFocus).
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function QueryFocusSetup() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return null;
}
