// The yearly QMS set: every department sends a new Quality Objectives, Issue Log,
// Risk Register and Opportunity Register each year. This file finds each one on
// W: (by folder, name and year) and in the DCRs raised for it. Pure logic, no screen.
import type { DCRRecord } from '../../types';
import type { WFile } from './wfilesApi';

export type AnnualDocKey = 'objectives' | 'issues' | 'risks' | 'opportunities';

export interface AnnualDoc {
  key: AnnualDocKey;
  label: string;
  docNo: string;
  /** True when this file is in the right W: place for the document. */
  inPlace: (f: WFile) => boolean;
}

export const ANNUAL_DOCS: AnnualDoc[] = [
  {
    key: 'objectives', label: 'Quality Objectives', docNo: 'PT-OBJ',
    inPlace: (f) => f.folder.startsWith('03 - Quality Objectives') && /^PT-OBJ/i.test(f.name),
  },
  { key: 'issues', label: 'Issue Log', docNo: 'FM-IL-15', inPlace: (f) => /\/Issues Log(\/|$)/i.test(f.folder) },
  { key: 'risks', label: 'Risk Register', docNo: 'FM-RR-18', inPlace: (f) => /\/Risk Register(\/|$)/i.test(f.folder) },
  { key: 'opportunities', label: 'Opportunity Register', docNo: 'FM-OR-19', inPlace: (f) => /\/Opportunity Register(\/|$)/i.test(f.folder) },
];

export interface AnnualDept {
  name: string;
  /** Words used for this department in W: file names. */
  aliases: string[];
  /** Documents this department does not send (MR sends only the combined registers). */
  skip?: AnnualDocKey[];
}

export const ANNUAL_DEPTS: AnnualDept[] = [
  { name: 'IED / QAQC', aliases: ['QAQC'] },
  { name: 'Projects', aliases: ['PROJECTS'] },
  { name: 'OSD', aliases: ['OSD', 'OPS'] },
  { name: 'Procurement', aliases: ['PRC', 'PROCUREMENT'] },
  { name: 'Stores', aliases: ['STORES', 'WAREHOUSE'] },
  { name: 'P&E', aliases: ['P&E', 'PE'] },
  { name: 'HR', aliases: ['HRD', 'HR'] },
  { name: 'IT', aliases: ['IT'] },
  { name: 'Facility', aliases: ['FACILITY'] },
  { name: 'MR (combined)', aliases: ['CONSOLIDATED'], skip: ['objectives'] },
];

/** Splits a file name into upper-case words: "FM-RR-18_Risk-Register_P&E_2025.pdf" -> [FM, RR, 18, RISK, ...]. */
function words(name: string): string[] {
  return name.replace(/\.[^.]+$/, '').toUpperCase().split(/[\s_\-.()]+/).filter(Boolean);
}

function hasYear(f: WFile, year: number): boolean {
  const y = String(year);
  return words(f.name).includes(y) || f.folder.split('/').includes(y);
}

/** W: files for one document, department and year, newest first. */
export function filesFor(files: WFile[], doc: AnnualDoc, dept: AnnualDept, year: number): WFile[] {
  return files
    .filter((f) => doc.inPlace(f) && hasYear(f, year))
    .filter((f) => { const w = words(f.name); return dept.aliases.some((a) => w.includes(a)); })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Tag saved on a DCR so the yearly screen can find it again. */
export function annualKey(doc: AnnualDocKey, dept: string, year: number): string {
  return `${doc}|${dept}|${year}`;
}

export type CellState =
  | { kind: 'na' }
  | { kind: 'onW'; files: WFile[] }
  | { kind: 'approved'; dcr: DCRRecord }
  | { kind: 'submitted'; dcr: DCRRecord }
  | { kind: 'missing'; lastYear: WFile | null };

/** Where one cell stands: on W:, approved (waiting MR copy), submitted, or missing. */
export function cellState(files: WFile[], dcrs: DCRRecord[], doc: AnnualDoc, dept: AnnualDept, year: number): CellState {
  if (dept.skip?.includes(doc.key)) return { kind: 'na' };
  const onW = filesFor(files, doc, dept, year);
  if (onW.length) return { kind: 'onW', files: onW };
  const key = annualKey(doc.key, dept.name, year);
  const mine = dcrs
    .filter((d) => d.annualKey === key && !d.isArchived && d.status !== 'Rejected')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const approved = mine.find((d) => d.status === 'Approved');
  if (approved) return { kind: 'approved', dcr: approved };
  if (mine[0]) return { kind: 'submitted', dcr: mine[0] };
  return { kind: 'missing', lastYear: filesFor(files, doc, dept, year - 1)[0] ?? null };
}
