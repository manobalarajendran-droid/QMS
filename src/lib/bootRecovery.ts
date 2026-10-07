/**
 * Bridge to the boot watchdog installed inline in index.html.
 *
 * The watchdog has to live in the HTML because the failure it guards against —
 * a stale HTML shell whose asset hashes no longer exist on the server — means
 * none of this bundle ever runs. Everything in here is the *second* line of
 * defence, for chunk failures that happen after the app is already alive.
 *
 * Both paths share one attempt budget, so a chunk that can never load produces
 * at most two reloads and then a readable error, never an endless reload loop.
 */

interface BootWatchdog {
  booted: boolean;
  /** Purge caches and reload. Returns false once the attempt budget is spent. */
  recover: (reason: string) => boolean;
  markBooted: () => void;
  /** Tells the watchdog the bundle downloaded and started running. */
  markScriptLoaded: () => void;
  /** Uncapped purge-and-reload, for a recovery the user asked for. */
  hardReset: () => void;
}

declare global {
  interface Window {
    __QMS_BOOT__?: BootWatchdog;
  }
}

const FALLBACK_KEY = 'qms:boot-recovery';
const FALLBACK_MAX_ATTEMPTS = 2;

/**
 * Ask the watchdog to purge caches and reload once.
 * Returns false when no attempts remain, so callers surface an error instead.
 */
export function bootRecover(reason: string): boolean {
  if (typeof window === 'undefined') return false;

  const watchdog = window.__QMS_BOOT__;
  if (watchdog) return watchdog.recover(reason);

  // index.html watchdog missing (e.g. a test harness rendering the app directly).
  // Apply the same capped policy locally so behaviour never degrades to a loop.
  let attempts = 0;
  try {
    attempts = parseInt(sessionStorage.getItem(FALLBACK_KEY) || '0', 10) || 0;
  } catch {
    return false;
  }
  if (attempts >= FALLBACK_MAX_ATTEMPTS) return false;
  try {
    sessionStorage.setItem(FALLBACK_KEY, String(attempts + 1));
  } catch {
    return false;
  }
  console.warn(`[boot] Recovering from "${reason}" (attempt ${attempts + 1}/${FALLBACK_MAX_ATTEMPTS}).`);
  window.location.reload();
  return true;
}

/**
 * Called as soon as the bundle starts executing. This is what tells the boot
 * watchdog the difference between a deployment that cannot load at all and one
 * that is simply taking its time to render.
 */
export function markScriptLoaded(): void {
  if (typeof window === 'undefined') return;
  window.__QMS_BOOT__?.markScriptLoaded();
}

/**
 * Called once the React tree has actually mounted. Disarms the watchdog timer
 * and clears the attempt budget so the next genuine failure gets a full retry.
 */
export function markAppBooted(): void {
  if (typeof window === 'undefined') return;
  if (window.__QMS_BOOT__) {
    window.__QMS_BOOT__.markBooted();
    return;
  }
  try {
    sessionStorage.removeItem(FALLBACK_KEY);
  } catch {
    // private mode — nothing to clear
  }
}

/**
 * Purge every cached copy of the app and reload, unconditionally.
 *
 * For user-initiated retries only. Once a dynamic import fails, the browser
 * records that URL as failed for the lifetime of the document and will not
 * fetch it again, so retrying a broken route in place is impossible — only a
 * fresh document can load it. Persisted quality records live in localStorage
 * and IndexedDB, which this does not touch.
 */
export function hardReload(): void {
  if (typeof window === 'undefined') return;

  const watchdog = window.__QMS_BOOT__;
  if (watchdog) {
    watchdog.hardReset();
    return;
  }

  try {
    sessionStorage.removeItem(FALLBACK_KEY);
  } catch {
    // private mode - nothing to clear
  }
  window.location.reload();
}
