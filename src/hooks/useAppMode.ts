import { useMemo } from 'react';
import { useAuth } from './useAuth';

export type AppMode = 'standalone' | 'server';

/**
 * 'server' when signed in to the QMS server, 'standalone' in offline mode.
 * Screens that call the server check this and show an offline message instead.
 */
export function useAppMode(): { mode: AppMode } {
  const { isAuthenticated, isOffline } = useAuth();
  const mode: AppMode = isAuthenticated && !isOffline ? 'server' : 'standalone';
  return useMemo(() => ({ mode }), [mode]);
}
