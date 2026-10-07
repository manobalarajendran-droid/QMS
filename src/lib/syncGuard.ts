/**
 * Pure rules used by qmsSync.ts (no store, no network), so they can be unit-tested.
 * Tests: qms-server/server/lib/clientSyncGuard.test.ts
 *
 * - H4: only a few records may be withdrawn in one go without asking the user.
 * - H5 / M23: a record the user changed but has not sent yet ("dirty") is never
 *   overwritten by a poll, a retry or a reload.
 * - C3: a server change is applied only when its version is newer than ours.
 */

export type SyncRecord = { id: string } & Record<string, unknown>;

/** More missing records than this in one push looks like a reset or a bad filter, not a user action. */
export const MAX_AUTO_WITHDRAW = 5;

export interface WithdrawPlan {
  /** Ids to withdraw on the server now. */
  withdraw: string[];
  /** Ids that went missing but were NOT withdrawn (too many at once). */
  held: string[];
}

/** Records that were on the server but are gone from the store. */
export function planWithdraw(
  syncedIds: Iterable<string>,
  storeIds: ReadonlySet<string>,
  limit: number = MAX_AUTO_WITHDRAW,
): WithdrawPlan {
  const missing = [...syncedIds].filter((id) => !storeIds.has(id));
  if (missing.length > limit) return { withdraw: [], held: missing };
  return { withdraw: missing, held: [] };
}

/** True when the server version is newer than the one this browser has. */
export function isNewer(incoming: number | undefined, known: number | undefined): boolean {
  if (incoming === undefined) return true; // an older server with no versions: always apply
  return known === undefined || incoming > known;
}

/** True when the user changed a record that came from the server and it is not sent yet. */
export function isDirty(localSnapshot: string | undefined, syncedSnapshot: string | undefined): boolean {
  return syncedSnapshot !== undefined && localSnapshot !== undefined && localSnapshot !== syncedSnapshot;
}

export interface MergeInput {
  server: readonly SyncRecord[];
  local: readonly SyncRecord[];
  /** Snapshot of each record as last seen on the server. */
  synced: ReadonlyMap<string, string>;
  snapshot: (record: SyncRecord) => string;
  /** false = server copy wins everywhere (used after a refused save). */
  keepLocalEdits: boolean;
  /** First load of this session: browser-only records are put aside by the caller, not kept. */
  firstLoad: boolean;
  /** H-B: ids saved in this browser's "not sent yet" list (survives a reload). */
  unsent?: ReadonlySet<string>;
  /** M9: ids removed here whose withdraw is not on the server yet. They stay out. */
  pendingWithdraw?: ReadonlySet<string>;
}

/**
 * Builds the store list after a reload from the server.
 * - Server records replace the browser copy, except records with unsent edits.
 * - Records created here and not sent yet are kept (not on the first load).
 * Order: server order, then the kept new records in their old order.
 */
export function mergePulled(input: MergeInput): { records: SyncRecord[]; keptDirty: string[] } {
  const { server, local, synced, snapshot, keepLocalEdits, firstLoad } = input;
  const unsent = input.unsent ?? new Set<string>();
  const gone = input.pendingWithdraw ?? new Set<string>();
  const localById = new Map(local.filter((r) => r?.id).map((r) => [r.id, r]));
  const onServer = new Set(server.map((r) => r.id));
  const keptDirty: string[] = [];
  const records = server
    .filter((r) => !(keepLocalEdits && gone.has(r.id)))
    .map((r) => {
      const mine = localById.get(r.id);
      if (!keepLocalEdits || !mine) return r;
      const mineText = snapshot(mine);
      // Changed since the last server copy, or listed as "not sent yet" and different (H-B).
      if (isDirty(mineText, synced.get(r.id)) || (unsent.has(r.id) && mineText !== snapshot(r))) {
        keptDirty.push(r.id);
        return mine;
      }
      return r;
    });
  if (keepLocalEdits) {
    for (const r of local) {
      if (!r?.id || onServer.has(r.id) || synced.has(r.id)) continue;
      // New here and not sent yet. On the first load only the ones in the
      // "not sent yet" list are kept; other browser-only records are put aside.
      if (!firstLoad || unsent.has(r.id)) records.push(r);
    }
  }
  return { records, keptDirty };
}

/**
 * M2: the server refused some records. Only those go back to the server copy
 * (from the last snapshot); a refused record the server never had is taken out.
 * Everything else the user typed stays.
 */
export function revertRefused(
  current: readonly SyncRecord[],
  refusedIds: readonly string[],
  synced: ReadonlyMap<string, string>,
): { records: SyncRecord[]; dropped: SyncRecord[] } {
  const refused = new Set(refusedIds);
  const dropped: SyncRecord[] = [];
  const records: SyncRecord[] = [];
  for (const r of current) {
    if (!refused.has(r.id)) {
      records.push(r);
      continue;
    }
    const text = synced.get(r.id);
    if (text !== undefined) records.push(JSON.parse(text) as SyncRecord);
    else dropped.push(r);
  }
  // A refused withdraw: the record is gone here but still on the server, so put it back.
  const present = new Set(records.map((r) => r.id));
  for (const id of refused) {
    const text = synced.get(id);
    if (!present.has(id) && text !== undefined) records.push(JSON.parse(text) as SyncRecord);
  }
  return { records, dropped };
}

/** H-A: true when the user changed the record after it was sent. */
export function editedSince(current: SyncRecord | undefined, sent: SyncRecord, snapshot: (r: SyncRecord) => string): boolean {
  return !!current && snapshot(current) !== snapshot(sent);
}

/**
 * H-A: the server stamped a saved record (e.g. who closed an NCR) while the user
 * kept typing. Keep the user's newer typing and add only the fields the server set.
 */
export function mergeStamp(current: SyncRecord, sent: SyncRecord, stamped: SyncRecord): SyncRecord {
  const out: SyncRecord = { ...current };
  for (const [k, v] of Object.entries(stamped)) {
    if (JSON.stringify(sent[k]) !== JSON.stringify(v)) out[k] = v;
  }
  return out;
}
