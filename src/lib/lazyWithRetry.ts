import { lazy, type ComponentType } from 'react';
import { bootRecover } from './bootRecovery';

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS',
];

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * React.lazy with retry and stale-chunk recovery.
 *
 * Why this exists:
 * 1. An HMR cycle or a redeploy changes chunk hashes on the server.
 * 2. A browser holding an older HTML shell requests a hash that is now gone, and
 *    the dynamic import rejects with "Failed to fetch dynamically imported module".
 * 3. That failure is permanent for the current page. The browser records the URL
 *    as failed in its module map and will not fetch it again, and React.lazy
 *    caches the rejection too. Nothing in this document can load that chunk.
 *
 * So the ladder is: retry a couple of times for a transient network blip, then one
 * capped purge-and-reload through the shared boot-recovery budget, and finally give
 * up and let the nearest ErrorBoundary render.
 *
 * The reload goes through that shared budget rather than calling location.reload()
 * here — reloading directly from this file is what turned a single missing chunk
 * into an endless reload loop. And once the app has booted, the budget refuses the
 * reload outright, because throwing away a live session to fix one route is worse
 * than showing that route's error card. The card's retry button offers the reload
 * explicitly instead.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  intervalMs = 500,
) {
  return lazy(
    () =>
      new Promise<{ default: T }>((resolve, reject) => {
        const attempt = (remaining: number) => {
          componentImport().then(resolve, (error: unknown) => {
            if (remaining > 0) {
              const message = error instanceof Error ? error.message : String(error);
              console.warn(`[lazyWithRetry] Import failed (${message}). Retrying in ${intervalMs}ms (${remaining} left).`);
              setTimeout(() => attempt(remaining - 1), intervalMs);
              return;
            }

            if (isChunkLoadError(error) && bootRecover('stale-chunk')) return;

            reject(error);
          });
        };

        attempt(retries);
      }),
  );
}
