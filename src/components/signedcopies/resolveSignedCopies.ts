// One pure matcher used by the card, the tracker, the Not linked list and the overview.
import type { WFile } from '../wfiles/wfilesApi';
import { isObsoleteName } from '../wfiles/wfileIndex';
import { RULES, type KeyGroup, type SignedTab } from './matchRules';

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

const keyPatterns = new Map<string, RegExp>();
/** A key matches only on a token edge: no letter or digit just before or after it. Separators inside the name are ignored. */
const keyPattern = (k: string): RegExp => {
  let re = keyPatterns.get(k);
  if (!re) {
    re = new RegExp(`(?<![a-z0-9])${[...k].join('[^a-z0-9]*')}(?![a-z0-9])`);
    keyPatterns.set(k, re);
  }
  return re;
};

/** The single file-vs-row predicate: every group must match, any one key of a group is enough. */
export const matches = (groups: KeyGroup[], name: string): boolean => {
  const n = name.toLowerCase();
  return groups.length > 0 && groups.every((g) => g.some((k) => k !== '' && keyPattern(k).test(n)));
};

const TUV_NAME = /(?<![a-z0-9])tuv(?![a-z0-9])/i;

/** Audit and TUV share one W: folder: "tuv" files belong to TUV only. */
const forTab = (tab: SignedTab, f: WFile) => {
  if (tab === 'audit') return !TUV_NAME.test(f.name);
  if (tab === 'tuv') return TUV_NAME.test(f.name);
  return true;
};

/** Row `a` is covered by row `b` when every key group of b holds a key that contains a's, and one is longer. */
const isSubPart = (a: SignedRow, b: SignedRow): boolean => {
  if (a.groups.length !== b.groups.length) return false;
  let longer = false;
  for (let i = 0; i < a.groups.length; i++) {
    const covered = a.groups[i].some((ka) => b.groups[i].some((kb) => {
      if (kb.includes(ka) && kb !== ka) longer = true;
      return kb.includes(ka);
    }));
    if (!covered) return false;
  }
  return longer;
};

/** When rows hit one file and one row's key is a strict sub-part of another's, keep the longer one only. */
const keepLongest = (hits: SignedRow[]): SignedRow[] =>
  hits.length < 2 ? hits : hits.filter((a) => !hits.some((b) => b !== a && isSubPart(a, b)));

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
    if (!inFolders(tab, f) || !forTab(tab, f) || handFiles.has(f.id)) continue;
    const obsolete = isObsoleteName(f.name);
    const hits = keepLongest(rows.filter((r) => !blocked.has(`${r.id}|${f.id}`) && matches(r.groups, f.name)));
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
