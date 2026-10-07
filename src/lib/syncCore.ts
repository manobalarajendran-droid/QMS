import type { StoreApi, UseBoundStore } from 'zustand';
import { withoutLocalAudit } from '../store/useAuditStore';
import type { SyncRecord } from './syncGuard';
import { writePendingWithdraw, writeUnsent } from './syncLocal';

/** Shared state and events for qmsSync, syncPull and syncPush. */

export type Collection =
  | 'ncr'
  | 'dml'
  | 'dcr'
  | 'objectives'
  | 'csi'
  | 'tuv'
  | 'audit_programme'
  | 'mrm'
  | 'client_intake'
  | 'change_control'
  | 'tasks'
  | 'kpi'
  | 'workflows'
  | 'workflow_runs';

/** The shape every synced store shares. */
interface SyncableStore {
  records: SyncRecord[];
  setRecords: (records: never[]) => void;
}

export type AnyStore = UseBoundStore<StoreApi<SyncableStore>>;

export type BindingState = 'idle' | 'live' | 'needs-import' | 'error';

export interface Binding {
  collection: Collection;
  store: AnyStore;
  state: BindingState;
  /** What we last saw on the server, so we can tell a real edit from a re-render. */
  lastSynced: Map<string, string>;
  /** Server version per record id (C3). */
  versions: Map<string, number>;
  /** Browser copy when the server could not be used (empty or failed load), to spot later edits. */
  baseline: Map<string, string>;
  /** True after the first successful load from the server in this session. */
  loadedOnce: boolean;
  /** H-B: records sent but not confirmed yet: id -> base version (kept in localStorage). */
  unsent: Map<string, number | null>;
  /** M9: removed here, withdraw not confirmed yet (kept in localStorage). */
  pendingWithdraw: Set<string>;
  /** H-A: one save at a time for this screen. Set in registerStore. */
  runPush: () => Promise<void>;
  /** H-B: failed saves in a row, and the timer for the next try. */
  retryAttempt: number;
  retryTimer?: ReturnType<typeof setTimeout>;
  unsubscribeStore?: () => void;
}

/** Same as the server's MAX_BATCH (Workers Free plan: 50 queries per request). */
export const BATCH = 20;

export const bindings = new Map<Collection, Binding>();

/** True while remote data is written into a store, so it is not sent straight back. */
let applyingRemote = false;
export const isApplyingRemote = () => applyingRemote;

export const stable = (value: unknown) => JSON.stringify(value);

export function setStore(binding: Binding, records: SyncRecord[]): void {
  applyingRemote = true;
  try {
    withoutLocalAudit(() => binding.store.getState().setRecords(records as never[]));
  } finally {
    applyingRemote = false;
  }
}

export function snapshotOf(records: readonly SyncRecord[]): Map<string, string> {
  return new Map(records.filter((r) => r?.id).map((r) => [r.id, stable(r)]));
}

export function baseVersionsOf(binding: Binding, ids: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const v = binding.versions.get(id);
    if (v !== undefined) out[id] = v;
  }
  return out;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Saves the H-B and M9 lists of this screen to localStorage. */
export function saveLocalLists(binding: Binding): void {
  writeUnsent(binding.collection, binding.unsent);
  writePendingWithdraw(binding.collection, binding.pendingWithdraw);
}

// ── Events ──────────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();
export function notify(): void {
  listeners.forEach((l) => l());
}

/** For the sync status / import UI. Returns an unsubscribe. */
export function onSyncChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Something the user should hear about: their change was not saved as made. */
export interface SyncConflict {
  collection: Collection;
  /**
   * changed        = someone else saved first; the server copy is now shown.
   * withdrawn      = the record was withdrawn by someone else.
   * refused        = the server refused the change (no right, or a status rule).
   * withdraw-held  = many records vanished at once; nothing was withdrawn.
   * not-saved      = the save failed (network, server error); it is kept here and tried again.
   * saved          = a change that failed before has now been saved.
   */
  kind: 'changed' | 'withdrawn' | 'refused' | 'withdraw-held' | 'not-saved' | 'saved';
  ids: string[];
  message: string;
}

const conflictListeners = new Set<(conflict: SyncConflict) => void>();

/** For a toast or banner. Returns an unsubscribe. */
export function onSyncConflict(listener: (conflict: SyncConflict) => void): () => void {
  conflictListeners.add(listener);
  return () => conflictListeners.delete(listener);
}

export function report(conflict: SyncConflict): void {
  console.warn(`[sync] ${conflict.collection}: ${conflict.message}`, conflict.ids);
  conflictListeners.forEach((l) => l(conflict));
}
