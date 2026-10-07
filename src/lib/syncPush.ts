import { ApiError, apiFetch } from './apiClient';
import { editedSince, mergeStamp, planWithdraw, revertRefused, type SyncRecord } from './syncGuard';
import { stashRecords } from './syncLocal';
import { retryDelay } from './syncQueue';
import { pull } from './syncPull';
import {
  BATCH,
  type Binding,
  baseVersionsOf,
  chunk,
  isApplyingRemote,
  notify,
  report,
  saveLocalLists,
  setStore,
  stable,
} from './syncCore';

/** Sending this browser's changes to the server (one save at a time per screen, H-A). */

interface SaveConflict {
  id: string;
  version: number;
  deleted: boolean;
  data: SyncRecord | null;
  reason: string;
}

interface SaveResult {
  versions: Record<string, number>;
  stamped: SyncRecord[];
  conflicts: SaveConflict[];
  refused: string[];
  auditFailed: boolean;
}

function idsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => (typeof r === 'string' ? r : r && typeof r === 'object' ? (r as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string');
}

function saveResultOf(body: unknown): SaveResult | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Partial<Omit<SaveResult, 'refused'>> & { refused?: unknown };
  if (!Array.isArray(b.conflicts) && !Array.isArray(b.refused)) return null;
  return {
    versions: b.versions && typeof b.versions === 'object' ? b.versions : {},
    stamped: Array.isArray(b.stamped) ? b.stamped.filter((r) => r && typeof r.id === 'string') : [],
    conflicts: (b.conflicts ?? []).filter((c) => c && typeof c.id === 'string'),
    refused: idsOf(b.refused),
    auditFailed: b.auditFailed === true,
  };
}

function forget(binding: Binding, id: string): void {
  binding.unsent.delete(id);
  binding.pendingWithdraw.delete(id);
}

/** Writes server copies into the store (replace, add or remove) in one go. */
function putServerCopies(binding: Binding, replace: Map<string, SyncRecord>, remove: Set<string>): void {
  if (!replace.size && !remove.size) return;
  const current = binding.store.getState().records ?? [];
  const next = current.filter((r) => !remove.has(r.id)).map((r) => replace.get(r.id) ?? r);
  const present = new Set(next.map((r) => r.id));
  for (const [id, r] of replace) if (!present.has(id) && !remove.has(id)) next.push(r);
  setStore(binding, next);
}

/** Someone else saved first: show their copy, keep the user's copy aside (M3). */
function takeConflicts(binding: Binding, conflicts: SaveConflict[], current: Map<string, SyncRecord>, replace: Map<string, SyncRecord>, remove: Set<string>): void {
  const changed: string[] = [];
  const withdrawn: string[] = [];
  const losers: SyncRecord[] = [];
  for (const c of conflicts) {
    forget(binding, c.id);
    const mine = current.get(c.id);
    if (c.deleted) {
      binding.lastSynced.delete(c.id);
      binding.versions.delete(c.id);
      remove.add(c.id);
      withdrawn.push(c.id);
      if (mine) losers.push(mine);
    } else if (c.data) {
      binding.lastSynced.set(c.id, stable(c.data));
      binding.versions.set(c.id, c.version);
      replace.set(c.id, c.data);
      changed.push(c.id);
      if (mine && stable(mine) !== stable(c.data)) losers.push(mine);
    } else {
      // Not on the server any more: the next save sends it as a new record.
      binding.versions.delete(c.id);
      binding.lastSynced.delete(c.id);
    }
  }
  stashRecords(binding.collection, losers, 'lost to a newer save by someone else');
  const kept = losers.length ? ' Your copy was kept in this browser (put-aside list).' : '';
  if (changed.length) report({ collection: binding.collection, kind: 'changed', ids: changed, message: `Someone else changed this record first. Their version is shown now.${kept}` });
  if (withdrawn.length) report({ collection: binding.collection, kind: 'withdrawn', ids: withdrawn, message: `This record was withdrawn by someone else.${kept}` });
}

/** Takes the server's answer to a save (200, 403 or 409) into the store and the version list. */
function applySaveResult(binding: Binding, sent: SyncRecord[], result: SaveResult): void {
  const skip = new Set([...result.conflicts.map((c) => c.id), ...result.refused]);
  for (const r of sent) {
    if (skip.has(r.id)) continue;
    const v = result.versions[r.id];
    if (v !== undefined) binding.versions.set(r.id, v);
    binding.lastSynced.set(r.id, stable(r)); // saved, or the server already had exactly this
    forget(binding, r.id);
  }
  const current = new Map((binding.store.getState().records ?? []).map((r) => [r.id, r]));
  const sentById = new Map(sent.map((r) => [r.id, r]));
  const replace = new Map<string, SyncRecord>();
  const remove = new Set<string>();
  for (const r of result.stamped) {
    binding.lastSynced.set(r.id, stable(r));
    const sentCopy = sentById.get(r.id);
    const mine = current.get(r.id);
    // H-A: the user kept typing during the save: keep that typing, add the server's stamp.
    replace.set(r.id, mine && sentCopy && editedSince(mine, sentCopy, stable) ? mergeStamp(mine, sentCopy, r) : r);
  }
  takeConflicts(binding, result.conflicts, current, replace, remove);
  putServerCopies(binding, replace, remove);
  if (result.auditFailed) console.warn(`[sync] ${binding.collection}: saved, but the history log entry failed.`);
}

/** M2: only the refused records go back to the server copy; the user's copy is put aside. */
function revertOnly(binding: Binding, ids: string[], message: string): void {
  if (!ids.length) return;
  const current = binding.store.getState().records ?? [];
  const wanted = new Set(ids);
  stashRecords(binding.collection, current.filter((r) => wanted.has(r.id)), 'refused by the server');
  const { records } = revertRefused(current, ids, binding.lastSynced);
  ids.forEach((id) => forget(binding, id));
  setStore(binding, records);
  report({ collection: binding.collection, kind: 'refused', ids, message: `${message} Your copy was kept in this browser (put-aside list).` });
}

/** The server's answer in an error, if it has one (403 or 409). */
function resultOfError(error: unknown, sentIds: string[]): SaveResult | null {
  if (!(error instanceof ApiError) || (error.status !== 403 && error.status !== 409)) return null;
  const result = saveResultOf(error.body);
  if (result) return result;
  // A 403 with no list (no right to edit this screen at all): every sent record is refused.
  if (error.status === 403) return { versions: {}, stamped: [], conflicts: [], refused: sentIds, auditFailed: false };
  return null;
}

async function saveChanged(binding: Binding, changed: SyncRecord[]): Promise<void> {
  if (!changed.length) return;
  // H-B: remember what is on its way, so a failed save survives a reload.
  for (const r of changed) binding.unsent.set(r.id, binding.versions.get(r.id) ?? null);
  saveLocalLists(binding);
  for (const part of chunk(changed, BATCH)) {
    const ids = part.map((r) => r.id);
    const body = { records: part, baseVersions: baseVersionsOf(binding, ids) };
    let result: SaveResult;
    let message = 'The server refused this change.';
    try {
      const answer = await apiFetch<unknown>(`/records/${binding.collection}`, { method: 'PUT', body: JSON.stringify(body) });
      result = saveResultOf(answer) ?? { versions: {}, stamped: [], conflicts: [], refused: [], auditFailed: false };
    } catch (error) {
      const fromError = resultOfError(error, ids);
      if (!fromError) throw error;
      result = fromError;
      if (error instanceof ApiError && error.message) message = error.message;
    }
    applySaveResult(binding, part, result);
    revertOnly(binding, result.refused, message);
    saveLocalLists(binding);
  }
}

async function withdrawRemoved(binding: Binding, ids: string[]): Promise<void> {
  if (!ids.length) return;
  // M9: remember the withdraw until the server confirms it.
  ids.forEach((id) => binding.pendingWithdraw.add(id));
  saveLocalLists(binding);
  for (const part of chunk(ids, BATCH)) {
    let result: SaveResult = { versions: {}, stamped: [], conflicts: [], refused: [], auditFailed: false };
    let message = 'The server refused to withdraw this record.';
    try {
      await apiFetch(`/records/${binding.collection}/withdraw`, { method: 'POST', body: JSON.stringify({ ids: part, baseVersions: baseVersionsOf(binding, part) }) });
    } catch (error) {
      const fromError = resultOfError(error, part);
      if (!fromError) throw error;
      result = fromError;
      if (error instanceof ApiError && error.message) message = error.message;
    }
    const held = new Set([...result.conflicts.map((c) => c.id), ...result.refused]);
    for (const id of part) {
      if (held.has(id)) continue;
      binding.lastSynced.delete(id);
      binding.versions.delete(id);
      forget(binding, id);
    }
    if (result.conflicts.length) applySaveResult(binding, [], result);
    revertOnly(binding, result.refused, message);
    saveLocalLists(binding);
  }
}

/** Records changed here since the last server copy, and records removed here. */
function changesOf(binding: Binding): { changed: SyncRecord[]; plan: ReturnType<typeof planWithdraw> } {
  const records = binding.store.getState().records ?? [];
  const seen = new Set<string>();
  const changed: SyncRecord[] = [];
  for (const record of records) {
    if (!record?.id) continue;
    seen.add(record.id);
    // On a screen still waiting for import, only edits made after loading are
    // sent (H1). The older browser-only records wait for the admin import.
    const reference =
      binding.lastSynced.get(record.id) ??
      (binding.state === 'needs-import' ? binding.baseline.get(record.id) : undefined);
    if (reference !== stable(record)) changed.push(record);
  }
  // In the server list but gone from the store = withdrawn here. The server
  // keeps the row (soft delete) so quality records stay auditable.
  return { changed, plan: planWithdraw(binding.lastSynced.keys(), seen) };
}

export function clearRetry(binding: Binding): void {
  if (binding.retryTimer) clearTimeout(binding.retryTimer);
  binding.retryTimer = undefined;
}

/** H-B: tell the user once, then try again after 5 s, 15 s, 30 s, 1 min, 2 min... */
function failed(binding: Binding, error: unknown): void {
  console.error(`[sync] could not save ${binding.collection}:`, error);
  binding.retryAttempt += 1;
  if (binding.retryAttempt === 1) {
    const ids = [...binding.unsent.keys(), ...binding.pendingWithdraw];
    report({ collection: binding.collection, kind: 'not-saved', ids, message: 'Your change is not saved yet (no connection or a server problem). It is kept in this browser and will be tried again.' });
  }
  clearRetry(binding);
  binding.retryTimer = setTimeout(() => void binding.runPush(), retryDelay(binding.retryAttempt - 1));
}

function succeeded(binding: Binding): void {
  clearRetry(binding);
  if (binding.retryAttempt > 0) {
    report({ collection: binding.collection, kind: 'saved', ids: [], message: 'Your earlier change is now saved.' });
  }
  binding.retryAttempt = 0;
}

/** One save run. Called only through binding.runPush (one at a time per screen). */
export async function push(binding: Binding): Promise<void> {
  if (isApplyingRemote()) return;
  if (binding.state !== 'live' && binding.state !== 'needs-import') return;
  const { changed, plan } = changesOf(binding);
  try {
    await saveChanged(binding, changed);
    if (plan.held.length) {
      report({
        collection: binding.collection,
        kind: 'withdraw-held',
        ids: plan.held,
        message: `${plan.held.length} records disappeared at once. Nothing was withdrawn; the server copy is shown again.`,
      });
      await pull(binding);
    } else {
      await withdrawRemoved(binding, plan.withdraw);
    }
    succeeded(binding);
  } catch (error) {
    failed(binding, error);
  }
  notify();
}
