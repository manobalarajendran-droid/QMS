// Per-tab rules: which W: folders hold a tab's signed copies, and which row values must be in the file name.
export type SignedTab = 'ncr' | 'dcr' | 'csi' | 'objectives' | 'audit' | 'tuv' | 'mrm';
export type KeyGroup = string[];
type Row = Record<string, unknown>;

export const SIGNED_TABS: SignedTab[] = ['ncr', 'dcr', 'csi', 'objectives', 'audit', 'tuv', 'mrm'];
export const TAB_LABEL: Record<SignedTab, string> = {
  ncr: 'NCR', dcr: 'DCR', csi: 'Customer satisfaction', objectives: 'Quality objectives',
  audit: 'Internal audit', tuv: 'TUV audit', mrm: 'Management review',
};

const R = '06 - Records (Owner-Controlled, Audit Read)';
export const RULES: Record<SignedTab, { folders: string[] }> = {
  ncr: { folders: [`${R}/NCR-CAPA Records (MR + Process Owner)`] },
  dcr: { folders: [`${R}/Document Control Records (MR only)`] },
  csi: { folders: [`${R}/Customer Records (MKT + GM)`] },
  objectives: { folders: ['03 - Quality Objectives (All HODs)'] },
  audit: { folders: [`${R}/Audit Records (MR + Auditors only)`] },
  tuv: { folders: [`${R}/Audit Records (MR + Auditors only)`] },
  mrm: { folders: [`${R}/Context & Planning Records (HODs + MR)`] },
};

/** Text keys shorter than this (after norm) are too weak to match a file name safely. */
export const MIN_KEY_LENGTH = 4;

export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Normalised text key, or '' when empty or shorter than MIN_KEY_LENGTH (so the row never auto-matches). */
const text = (v: unknown) => {
  const n = v == null ? '' : norm(String(v));
  return n.length >= MIN_KEY_LENGTH ? n : '';
};
/** Digits only, padded to 3 ("2" becomes "002") so it cannot hit unrelated numbers. */
const digits = (v: unknown) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d === '' ? '' : d.padStart(3, '0');
};
const year = (...vs: unknown[]) => {
  for (const v of vs) {
    const m = String(v ?? '').match(/(19|20)\d{2}/);
    if (m) return m[0];
  }
  return '';
};

/** Groups of keys. Returns [] when any needed value is empty, so the row never auto-matches. */
export function rowKeys(tab: SignedTab, row: Row): KeyGroup[] {
  const groups = build(tab, row);
  return groups.every((g) => g.length > 0 && g.every((k) => k !== '')) ? groups : [];
}

function build(tab: SignedTab, r: Row): KeyGroup[] {
  switch (tab) {
    case 'ncr': return [[text(r.ref)], [text(r.project)], [year(r.dt)]];
    case 'dcr': return [['dcr', 'documentchangerequest'], [digits(r.dcrNo)]];
    case 'csi': return [[text(r.clientName ?? r.cl)], [year(r.yr, r.surveyDate, r.dt)]];
    case 'objectives': return [[text(r.dept)], [year(r.yr)]];
    case 'audit': return [[text(r.dep ?? r.auditee)], [year(r.dt, r.completedDate)]];
    // TUVRecord has no year field of its own: take the year from due, then closed, verified, created.
    case 'tuv': return [['tuv'], [year(r.due, r.closed, r.verifiedDate, r.createdAt)]];
    case 'mrm': return [['mrm', 'managementreview'], [year(r.meetingDate)]];
  }
}
