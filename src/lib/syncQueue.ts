/**
 * Small timing helpers for qmsSync (no store, no network), so they can be unit-tested.
 * Tests: qms-server/server/lib/clientSyncGuard.test.ts
 */

/**
 * H-A: runs a job one at a time. A call made while the job is running does not
 * start a second copy; it asks for ONE more run after the current one ends, so
 * that run uses the newest versions and the newest store.
 */
export function createSerialRunner(job: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;
  const loop = async (): Promise<void> => {
    try {
      do {
        again = false;
        await job();
      } while (again);
    } finally {
      running = null;
    }
  };
  return () => {
    if (running) {
      again = true;
      return running;
    }
    running = loop();
    return running;
  };
}

const RETRY_STEPS_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

/** H-B: wait before the next try after a failed save: 5 s, 15 s, 30 s, 1 min, then every 2 min. */
export function retryDelay(attempt: number): number {
  const i = Math.max(0, Math.min(attempt, RETRY_STEPS_MS.length - 1));
  return RETRY_STEPS_MS[i];
}

/**
 * M1: fetch first, THEN read the store, so edits made while the fetch was
 * running are part of the merge and are not lost.
 */
export async function fetchThenReadLocal<S, L>(fetchServer: () => Promise<S>, readLocal: () => L): Promise<{ server: S; local: L }> {
  const server = await fetchServer();
  return { server, local: readLocal() };
}
