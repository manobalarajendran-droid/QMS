/**
 * Design constants, color tokens, and utility functions for Audit and Management Review charts.
 * Separated from AuditCharts.tsx to maintain React Fast Refresh boundaries (components only).
 */

export const T = {
  /** Column headers and eyebrows. Uppercase, so kept at 10px only for short words. */
  micro: 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary',
  /** Supporting meta under a value. */
  label: 'text-[11px] text-text-tertiary',
  /** Default reading size. */
  body: 'text-[12.5px] text-text-secondary',
  /** Card and section headings. */
  section: 'text-[12.5px] font-semibold text-text-primary',
  /** Standard KPI value. */
  metric: 'text-[18px] font-semibold leading-none tabular-nums tracking-tight text-text-primary',
  /** The one value allowed to be larger. Used once per screen. */
  hero: 'text-[26px] font-semibold leading-none tabular-nums tracking-tight text-text-primary',
} as const;

/** Premium glassmorphism card for a modern UX. */
export const CARD = 'border border-border/60 shadow-sm rounded-2xl bg-surface dark:bg-surface';

/* ------------------------------------------------------------------ */
/* ISO 9001:2015 clause spine                                          */
/* ------------------------------------------------------------------ */

/**
 * TÜV audits against clauses, so "where are we weak" is a clause question.
 * Records carry `cl` as a sub-clause ("7.1.3"); the leading digit is the
 * clause family. Clauses 1-3 are scope/references/terms and are never
 * audited for conformity, so the spine runs 4 through 10.
 */
export const ISO_CLAUSES = [
  { id: 4, name: 'Context' },
  { id: 5, name: 'Leadership' },
  { id: 6, name: 'Planning' },
  { id: 7, name: 'Support' },
  { id: 8, name: 'Operation' },
  { id: 9, name: 'Performance' },
  { id: 10, name: 'Improvement' },
] as const;

export function clauseFamily(cl?: string): number | null {
  if (!cl) return null;
  const match = /^\s*(\d{1,2})/.exec(cl);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 4 && n <= 10 ? n : null;
}

export interface ClauseDatum {
  clause: number;
  total: number;
  overdue: number;
}

export interface StageDatum {
  name: string;
  value: number;
  color: string;
}

export interface DeptDatum {
  dept: string;
  pct: number;
  count: number;
  overdue: number;
}
