import type { SyncRecord } from './syncGuard';

/**
 * What qmsSync keeps in this browser so nothing typed is lost (survives a reload):
 * - H-B  "not sent yet": id -> the server version the edit was based on (null = new record).
 * - M9   "withdraw not sent yet": ids removed here, not yet withdrawn on the server.
 * - M3   put-aside copies (`pta-qms:unsynced:<collection>`): an edit that lost to
 *        someone else's save, or records that only existed in this browser.
 * Storage can be passed in for tests. Every read/write is wrapped: a full or
 * blocked storage must never break the sync.
 */

/** The part of localStorage this file uses (no DOM types, so server tests can import it). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(given?: KeyValueStore): KeyValueStore | null {
  if (given) return given;
  try {
    return (globalThis as { localStorage?: KeyValueStore }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T, given?: KeyValueStore): T {
  try {
    const text = storage(given)?.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown, empty: boolean, given?: KeyValueStore): void {
  try {
    const s = storage(given);
    if (!s) return;
    if (empty) s.removeItem(key);
    else s.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`[sync] could not write ${key} in this browser.`);
  }
}

const unsentKey = (collection: string) => `pta-qms:unsent:${collection}`;
const pendingKey = (collection: string) => `pta-qms:pending-withdraw:${collection}`;
const stashKey = (collection: string) => `pta-qms:unsynced:${collection}`;

/** H-B: id -> base version (null when the record is new). */
export function readUnsent(collection: string, given?: KeyValueStore): Map<string, number | null> {
  const raw = readJson<Record<string, number | null>>(unsentKey(collection), {}, given);
  return new Map(Object.entries(raw).filter(([, v]) => v === null || typeof v === 'number'));
}

export function writeUnsent(collection: string, unsent: ReadonlyMap<string, number | null>, given?: KeyValueStore): void {
  writeJson(unsentKey(collection), Object.fromEntries(unsent), unsent.size === 0, given);
}

/** M9: ids removed here whose withdraw has not reached the server yet. */
export function readPendingWithdraw(collection: string, given?: KeyValueStore): Set<string> {
  const raw = readJson<unknown>(pendingKey(collection), [], given);
  return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
}

export function writePendingWithdraw(collection: string, ids: ReadonlySet<string>, given?: KeyValueStore): void {
  writeJson(pendingKey(collection), [...ids], ids.size === 0, given);
}

/**
 * M3: put copies aside so the user (or an admin) can find them again.
 * A record already put aside with the same id is replaced by the newer copy.
 */
export function stashRecords(collection: string, records: readonly SyncRecord[], why: string, given?: KeyValueStore): void {
  if (!records.length) return;
  const before = readJson<SyncRecord[]>(stashKey(collection), [], given);
  const ids = new Set(records.map((r) => r.id));
  const stamped = records.map((r) => ({ ...r, _putAside: why }));
  writeJson(stashKey(collection), [...before.filter((r) => !ids.has(r?.id)), ...stamped], false, given);
  console.warn(`[sync] ${collection}: ${records.length} record(s) kept in ${stashKey(collection)} (${why}).`);
}

export function readStash(collection: string, given?: KeyValueStore): SyncRecord[] {
  return readJson<SyncRecord[]>(stashKey(collection), [], given);
}
