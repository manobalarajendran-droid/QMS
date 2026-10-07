// Joins W: files to Document Master List rows by document number.
// The DML writes numbers with slashes ("PT/QSP/MR/02") and W: file names use dashes,
// spaces or underscores ("PT-QSP-MR-02 Control of ... Rev 01.pdf", "PT-CPDR-9 Proposal.docx").
// Both sides are turned into one key ("PT-QSP-MR-2") so they can be matched.
import type { WFile } from './wfilesApi';

/** One key for a document number: upper case, dashes only, no leading zeros. */
export function normDocNo(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/&/g, '') // "P&E" on the DML is "PE" in file names
    .replace(/^[^A-Z0-9]+/, '')
    .split(/[\s/_.-]+/)
    .filter(Boolean)
    .map((p) => (/^\d+$/.test(p) ? String(Number(p)) : p))
    .join('-');
}

// PT or FM, one to three letter groups ("QSP", "MR", "P&E"), then the number,
// then maybe a one-letter part ("PT-HRR-04-A"). Stops before "Rev 01".
const SEP = '[\\s_/-]+';
const GROUP = '(?!REV\\b)[A-Z&]{1,5}';
const DOC_IN_NAME = new RegExp(
  `(?:^|[^A-Z0-9])((?:PT|FM)${SEP}${GROUP}(?:${SEP}${GROUP}){0,2}[\\s_/-]*\\d{1,3})(?:-([A-Z])(?![A-Z0-9]))?`,
);

/** Keys a file name answers to: the full number, and without its letter part. */
export function docKeysFromName(name: string): string[] {
  const m = DOC_IN_NAME.exec(name.toUpperCase());
  if (!m) return [];
  const base = normDocNo(m[1]);
  return m[2] ? [`${base}-${m[2]}`, base] : [base];
}

/** True for files kept only as history (old revisions). */
export function isObsoleteName(name: string): boolean {
  return /OBSOLETE|SUPERSEDED/i.test(name);
}

export interface WFileIndex {
  /** Files for a DML number, current files first, newest first. */
  filesFor: (docNo: string | null | undefined) => WFile[];
  /** Files whose name has a document number that no DML row uses. */
  orphans: WFile[];
  /** Files with no document number in the name at all. */
  unnumbered: WFile[];
}

function byCurrentThenNewest(a: WFile, b: WFile): number {
  const oa = isObsoleteName(a.name) ? 1 : 0;
  const ob = isObsoleteName(b.name) ? 1 : 0;
  if (oa !== ob) return oa - ob;
  return b.at.localeCompare(a.at);
}

/** Builds the lookup once per file list. dmlNos = every DML row's number. */
export function buildWFileIndex(files: readonly WFile[], dmlNos: readonly (string | undefined)[]): WFileIndex {
  const byKey = new Map<string, WFile[]>();
  const unnumbered: WFile[] = [];
  const keysOf = new Map<string, string[]>();
  for (const f of files) {
    const keys = docKeysFromName(f.name);
    keysOf.set(f.id, keys);
    if (!keys.length) { unnumbered.push(f); continue; }
    for (const k of keys) byKey.set(k, [...(byKey.get(k) ?? []), f]);
  }
  for (const [k, list] of byKey) byKey.set(k, [...list].sort(byCurrentThenNewest));

  const known = new Set(dmlNos.map(normDocNo).filter(Boolean));
  const orphans = files.filter((f) => {
    const keys = keysOf.get(f.id) ?? [];
    return keys.length > 0 && !keys.some((k) => known.has(k));
  });

  return {
    filesFor: (docNo) => byKey.get(normDocNo(docNo)) ?? [],
    orphans,
    unnumbered,
  };
}
