import { apiFetch } from './apiClient';
import { mergePulled, type SyncRecord } from './syncGuard';
import { stashRecords } from './syncLocal';
import { fetchThenReadLocal } from './syncQueue';
import { type Binding, type Collection, setStore, snapshotOf, stable } from './syncCore';

/** Loading a collection from the server into its store. */

const PAGE = 500;

interface ServerList {
  records: SyncRecord[];
  versions: Record<string, number>;
  now?: string;
}

async function fetchAll(collection: Collection): Promise<ServerList> {
  const out: ServerList = { records: [], versions: {} };
  let cursor = '';
  for (;;) {
    const query = `limit=${PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const page = await apiFetch<{
      records: SyncRecord[];
      versions?: Record<string, number>;
      nextCursor: string | null;
      now?: string;
    }>(`/records/${collection}?${query}`);
    out.records.push(...page.records.filter((r) => r && typeof r.id === 'string'));
    Object.assign(out.versions, page.versions ?? {});
    out.now ??= page.now;
    if (!page.nextCursor) return out;
    cursor = page.nextCursor;
  }
}

/**
 * Before the server copy replaces the browser copy for the first time, put any
 * record that exists ONLY in this browser aside (M3 stash), so nothing typed
 * offline is lost silently. Records waiting to be sent (H-B) stay in the store too.
 */
function keepUnsynced(binding: Binding, local: SyncRecord[], serverRecords: SyncRecord[]): void {
  const onServer = new Set(serverRecords.map((r) => r.id));
  const onlyHere = local.filter((r) => r?.id && !onServer.has(r.id) && !binding.unsent.has(r.id));
  stashRecords(binding.collection, onlyHere, 'only in this browser at first load');
}

/**
 * Loads a collection from the server. Returns the server time of the read.
 * keepLocalEdits=false makes the server copy win everywhere.
 * M1: the store is read AFTER the fetch, so edits made during the fetch are kept.
 */
export async function pull(binding: Binding, keepLocalEdits = true): Promise<string | undefined> {
  const counted = await apiFetch<{ count: number; total: number; now?: string }>(
    `/records/${binding.collection}/count`,
  );
  if (counted.total === 0) {
    const local = binding.store.getState().records ?? [];
    if (binding.state !== 'needs-import') binding.baseline = snapshotOf(local);
    binding.lastSynced.clear();
    binding.versions.clear();
    binding.state = 'needs-import';
    return counted.now;
  }
  const { server: list, local } = await fetchThenReadLocal(
    () => fetchAll(binding.collection),
    () => binding.store.getState().records ?? [],
  );
  const firstLoad = !binding.loadedOnce;
  if (firstLoad) keepUnsynced(binding, local, list.records);
  // Reference for "changed here": the server snapshot, or the browser copy
  // taken when the server could not be used yet (M23).
  const reference = firstLoad ? new Map([...binding.baseline, ...binding.lastSynced]) : binding.lastSynced;
  const { records, keptDirty } = mergePulled({
    server: list.records,
    local,
    synced: reference,
    snapshot: stable,
    keepLocalEdits,
    firstLoad,
    unsent: new Set(binding.unsent.keys()),
    pendingWithdraw: binding.pendingWithdraw,
  });
  const oldVersions = binding.versions;
  binding.lastSynced = snapshotOf(list.records);
  binding.versions = new Map(Object.entries(list.versions));
  // An unsent edit keeps the version it was based on, so the next save is
  // checked against the newer server copy instead of overwriting it.
  for (const id of keptDirty) {
    const base = binding.unsent.has(id) ? binding.unsent.get(id) : oldVersions.get(id);
    if (typeof base === 'number') binding.versions.set(id, base);
    // A new record (base null) that the server now has: send with no base, so the
    // server reports a conflict instead of us overwriting its copy.
    else if (base === null) binding.versions.delete(id);
  }
  binding.baseline = new Map();
  binding.loadedOnce = true;
  binding.state = 'live';
  setStore(binding, records);
  return list.now ?? counted.now;
}
