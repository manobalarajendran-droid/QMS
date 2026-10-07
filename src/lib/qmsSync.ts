import { apiFetch } from './apiClient';
import { isDirty, isNewer, type SyncRecord } from './syncGuard';
import { readPendingWithdraw, readUnsent } from './syncLocal';
import { createSerialRunner } from './syncQueue';
import { pull } from './syncPull';
import { clearRetry, push } from './syncPush';
import {
  type AnyStore,
  BATCH,
  type Binding,
  type Collection,
  bindings,
  chunk,
  notify,
  report,
  saveLocalLists,
  setStore,
  snapshotOf,
  stable,
} from './syncCore';

export { onSyncChange, onSyncConflict } from './syncCore';
export type { Collection, SyncConflict } from './syncCore';

/**
 * Keeps the PTA screens' zustand stores and the server (/api/records) in step.
 * Split into: syncCore (state, events), syncPull (loading), syncPush (saving),
 * and this file (start/stop, poll, import). Exported names are unchanged.
 *
 * - When someone signs in, each screen's records are loaded from the server.
 *   The server is the source of truth; the browser copy is an offline cache.
 * - Only records that really changed are sent, in batches of 20, ONE save at a
 *   time per screen (H-A). Every record has a version; if someone else saved
 *   first the server answers 409, this browser shows the server copy, keeps the
 *   user's copy aside and tells the screen through onSyncConflict.
 * - A failed save (network, server error) is kept in localStorage, shown as
 *   "not saved" and tried again (H-B). A removal is kept until the server
 *   confirms the withdraw (M9).
 * - Other people's changes arrive by one small poll every 30 seconds. A record
 *   changed here but not sent yet is never overwritten by a poll or a reload.
 * - A screen whose server list is still EMPTY keeps the browser copy; older
 *   browser-only records wait for an admin to run importLocalData.
 * - If more than a few records vanish at once, nothing is withdrawn (H4).
 */

const POLL_MS = 30_000;
const DEBOUNCE_MS = 600;

let started = false;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let since = '';

// ── Registration ────────────────────────────────────────────────────────────

export function registerStore(collection: Collection, store: AnyStore): void {
  const binding: Binding = {
    collection,
    store,
    state: 'idle',
    lastSynced: new Map(),
    versions: new Map(),
    baseline: new Map(),
    loadedOnce: false,
    unsent: readUnsent(collection),
    pendingWithdraw: readPendingWithdraw(collection),
    runPush: async () => undefined,
    retryAttempt: 0,
  };
  binding.runPush = createSerialRunner(() => push(binding));
  bindings.set(collection, binding);
}

// ── Other people's changes (one poll for every screen) ──────────────────────

interface Change {
  collection: string;
  id: string;
  deleted: boolean;
  version?: number;
  data: SyncRecord | null;
}

function applyChange(binding: Binding, current: SyncRecord[], change: Change): SyncRecord[] | null {
  // M9: removed here, withdraw not confirmed yet: do not bring it back.
  if (binding.pendingWithdraw.has(change.id)) {
    if (!change.deleted) return null;
    binding.pendingWithdraw.delete(change.id);
    saveLocalLists(binding);
  }
  // Our own write coming back, or a change we already have.
  if (!isNewer(change.version, binding.versions.get(change.id))) return null;
  const mine = current.find((r) => r.id === change.id);
  const dirty = mine ? isDirty(stable(mine), binding.lastSynced.get(change.id)) : false;
  if (change.deleted) {
    binding.versions.delete(change.id);
    if (!binding.lastSynced.delete(change.id) && !mine) return null;
    if (dirty) {
      report({ collection: binding.collection, kind: 'withdrawn', ids: [change.id], message: 'This record was withdrawn by someone else.' });
    }
    return current.filter((r) => r.id !== change.id);
  }
  if (!change.data) return null;
  // An edit that is not sent yet wins here; its save is then checked against
  // the newer server version and the user is told (H5).
  if (dirty) return null;
  binding.lastSynced.set(change.id, stable(change.data));
  if (change.version !== undefined) binding.versions.set(change.id, change.version);
  return mine ? current.map((r) => (r.id === change.id ? change.data! : r)) : [...current, change.data];
}

async function pullQuietly(binding: Binding): Promise<void> {
  try {
    await pull(binding);
  } catch (error) {
    console.warn(`[sync] reload of ${binding.collection} failed:`, error);
  }
}

/** Screens whose first load failed get another try on every poll. */
async function retryFailed(): Promise<void> {
  const failed = [...bindings.values()].filter((b) => b.state === 'error');
  if (!failed.length) return;
  for (const binding of failed) await pullQuietly(binding);
  notify();
}

async function poll(): Promise<void> {
  if (!started || document.hidden) return;
  await retryFailed();
  try {
    const result = await apiFetch<{ now: string; tooMany: boolean; changes: Change[] }>(
      `/records/changes?since=${encodeURIComponent(since)}`,
    );
    since = result.now;
    if (result.tooMany) {
      for (const binding of bindings.values()) await pullQuietly(binding);
      notify();
      return;
    }
    const touched = new Map<Binding, SyncRecord[]>();
    const reload = new Set<Binding>();
    for (const change of result.changes) {
      const binding = bindings.get(change.collection as Collection);
      if (!binding) continue;
      if (binding.state === 'needs-import') {
        // Someone else added records (not our own first saves): load the screen.
        if (isNewer(change.version, binding.versions.get(change.id))) reload.add(binding);
        continue;
      }
      if (binding.state !== 'live') continue;
      const current = touched.get(binding) ?? binding.store.getState().records ?? [];
      const next = applyChange(binding, current, change);
      if (next) touched.set(binding, next);
    }
    for (const [binding, records] of touched) setStore(binding, records);
    for (const binding of reload) await pullQuietly(binding);
    if (touched.size || reload.size) notify();
  } catch (error) {
    console.warn('[sync] poll failed:', error);
  }
}

// ── One-time import of this browser's records ───────────────────────────────

export interface ImportResult {
  collection: Collection;
  imported: number;
  skipped: number;
}

/**
 * Sends this browser's records to the server for every screen whose server
 * list is still empty. Admin only (the server checks). Insert-only: a record
 * already on the server is never overwritten, so running it twice is safe.
 */
export async function importLocalData(): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const binding of bindings.values()) {
    if (binding.state !== 'needs-import') continue;
    const records = (binding.store.getState().records ?? []).filter((r) => r?.id);
    if (!records.length) continue;
    let imported = 0;
    let skipped = 0;
    for (const part of chunk(records, BATCH)) {
      const r = await apiFetch<{ imported: number; skipped: number }>(
        `/records/${binding.collection}/import`,
        { method: 'POST', body: JSON.stringify({ records: part }) },
      );
      imported += r.imported;
      skipped += r.skipped;
    }
    await pull(binding);
    results.push({ collection: binding.collection, imported, skipped });
  }
  notify();
  return results;
}

/** Screens with records in this browser that are not on the server yet. */
export function pendingImports(): Array<{ collection: Collection; count: number }> {
  return [...bindings.values()]
    .filter((b) => b.state === 'needs-import')
    .map((b) => ({ collection: b.collection, count: (b.store.getState().records ?? []).length }))
    .filter((p) => p.count > 0);
}

// ── Start / stop ────────────────────────────────────────────────────────────

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

function onVisible(): void {
  if (document.visibilityState === 'visible') void poll();
}

export async function startSync(): Promise<void> {
  if (started) return;
  started = true;

  const serverTimes: string[] = [];
  await Promise.all(
    [...bindings.values()].map(async (binding) => {
      // H-B / M9: what this browser had not sent before the last reload.
      binding.unsent = readUnsent(binding.collection);
      binding.pendingWithdraw = readPendingWithdraw(binding.collection);
      try {
        const now = await pull(binding);
        if (now) serverTimes.push(now);
      } catch (error) {
        binding.baseline = snapshotOf(binding.store.getState().records ?? []);
        binding.state = 'error';
        console.error(`[sync] could not load ${binding.collection}:`, error);
      }
      binding.unsubscribeStore = binding.store.subscribe(debounce(() => void binding.runPush(), DEBOUNCE_MS));
      if (binding.unsent.size || binding.pendingWithdraw.size) void binding.runPush();
    }),
  );
  // The first "since" is the SERVER's time of the earliest read, never this
  // PC's clock (H12). The PC clock is only a last resort when every load failed.
  since = serverTimes.sort()[0] ?? new Date().toISOString();
  notify();

  pollTimer = setInterval(() => void poll(), POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
}

export function stopSync(): void {
  for (const binding of bindings.values()) {
    binding.unsubscribeStore?.();
    binding.unsubscribeStore = undefined;
    clearRetry(binding);
    binding.retryAttempt = 0;
    binding.lastSynced.clear();
    binding.versions.clear();
    binding.baseline = new Map();
    binding.loadedOnce = false;
    binding.state = 'idle';
    // unsent / pendingWithdraw stay in localStorage for the next sign-in.
  }
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = undefined;
  document.removeEventListener('visibilitychange', onVisible);
  started = false;
  notify();
}

/** Used by the status chip and settings screen. */
export function syncStatus(): { running: boolean; collections: number; failed: number } {
  const all = [...bindings.values()];
  return { running: started, collections: all.length, failed: all.filter((b) => b.state === 'error').length };
}
