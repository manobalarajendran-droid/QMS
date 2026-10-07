// One pure matcher used by the card, the tracker, the Not linked list and the overview.
import type { WFile } from '../wfiles/wfilesApi';
import { isObsoleteName } from '../wfiles/wfileIndex';
import { norm, RULES, type KeyGroup, type SignedTab } from './matchRules';

export interface LinkNote { id: string; tab: SignedTab; rowId: string; wFileId: string; fileName: string; kind: 'link' | 'not_this_one' }
export interface RowFile { file: WFile | null; fileName: string; how: 'auto' | 'hand'; linkId?: string; old: boolean; missingOnW: boolean }
export interface NotLinkedFile { file: WFile; reason: 'no_row' | 'many_rows' }
export interface SignedRow { id: string; groups: KeyGroup[] }
export interface Resolved {
  byRow: Record<string, RowFile[]>;
  notLinked: NotLinkedFile[];
  counts: { signed: number; missing: number; notLinked: number } | null;
}

const inFolders = (tab: SignedTab, f: WFile) =>
  RULES[tab].folders.some((p) => f.folder === p || f.folder.startsWith(p + '/'));

/** The single file-vs-row predicate: every group must match, any one key of a group is enough. */
export const matches = (groups: KeyGroup[], name: string): boolean => {
  const n = norm(name);
  return groups.length > 0 && groups.every((g) => g.some((k) => k !== '' && n.includes(k)));
};

export function resolveSignedCopies(tab: SignedTab, rows: SignedRow[], files: WFile[] | null, links: LinkNote[]): Resolved {
  const byId = new Map((files ?? []).map((f) => [f.id, f]));
  const byRow: Record<string, RowFile[]> = Object.fromEntries(rows.map((r) => [r.id, []]));
  const handFiles = new Set<string>();
  const blocked = new Set<string>();

  for (const l of links) {
    if (!(l.rowId in byRow)) continue;
    if (l.kind === 'not_this_one') { blocked.add(`${l.rowId}|${l.wFileId}`); continue; }
    const f = byId.get(l.wFileId) ?? null;
    handFiles.add(l.wFileId);
    byRow[l.rowId] = [...byRow[l.rowId], {
      file: f, fileName: f?.name ?? l.fileName, how: 'hand', linkId: l.id,
      old: isObsoleteName(l.fileName), missingOnW: files !== null && f === null,
    }];
  }

  const notLinked: NotLinkedFile[] = [];
  for (const f of files ?? []) {
    if (!inFolders(tab, f) || handFiles.has(f.id)) continue;
    const obsolete = isObsoleteName(f.name);
    const hits = rows.filter((r) => !blocked.has(`${r.id}|${f.id}`) && matches(r.groups, f.name));
    if (hits.length === 1) {
      const id = hits[0].id;
      byRow[id] = [...byRow[id], { file: f, fileName: f.name, how: 'auto', old: obsolete, missingOnW: false }];
    } else if (!obsolete) {
      notLinked.push({ file: f, reason: hits.length > 1 ? 'many_rows' : 'no_row' });
    }
  }

  if (files === null) return { byRow, notLinked: [], counts: null };
  const signed = rows.filter((r) => byRow[r.id].some((x) => !x.old)).length;
  return { byRow, notLinked, counts: { signed, missing: rows.length - signed, notLinked: notLinked.length } };
}
