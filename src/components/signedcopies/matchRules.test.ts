import { describe, it, expect } from 'vitest';
import { norm, rowKeys, RULES, type SignedTab } from './matchRules';
import { matches } from './resolveSignedCopies';

const hit = (tab: SignedTab, row: Record<string, unknown>, name: string) =>
  matches(rowKeys(tab, row), name);

describe('matchRules', () => {
  it('norm keeps letters and digits only, lower case', () => {
    expect(norm('NCR-03 / AR-RAZI')).toBe('ncr03arrazi');
  });
  it('NCR: matches on ref only', () => {
    const row = { ref: 'JULY-2024-01', project: 'PLAN-TECH Workshop - Steam Jacket', dt: '27-Jul-2024' };
    expect(hit('ncr', row, 'FM-NC-13_NCR JULY 2024 01.pdf')).toBe(true);
    expect(hit('ncr', row, 'FM-NC-13_JULY-2024-01_signed.pdf')).toBe(true);
    expect(hit('ncr', row, 'FM-NC-13_JULY-2024-02.pdf')).toBe(false);
  });
  it('DCR: the words + the number', () => {
    const row = { dcrNo: 'DCR-002' };
    expect(hit('dcr', row, 'DOCUMENT CHANGE REQUEST- 002 - FM-NC-13.pdf')).toBe(true);
    expect(hit('dcr', row, 'DOCUMENT CHANGE REQUEST- 003 - FM-NC-13.pdf')).toBe(false);
  });
  it('DCR: a number without leading zeros is padded to 3 digits', () => {
    expect(rowKeys('dcr', { dcrNo: '2' })[1]).toEqual(['002']);
  });
  it('DCR: the last digit group of a real number like DCR-2026-001 is used', () => {
    const row = { dcrNo: 'DCR-2026-001' };
    expect(hit('dcr', row, 'DOCUMENT CHANGE REQUEST- 001.pdf')).toBe(true);
    expect(hit('dcr', row, 'DOCUMENT CHANGE REQUEST- 002.pdf')).toBe(false);
  });
  it('Audit: uses ref when present, else area + year', () => {
    const row = { ref: 'IA-2025-01', dep: 'All Departments', dt: '2025-11-15' };
    expect(hit('audit', row, 'Internal Audit IA-2025-01 report.pdf')).toBe(true);
    expect(hit('audit', row, 'Internal Audit IA-2025-02 report.pdf')).toBe(false);
    expect(hit('audit', { dep: 'Production', dt: '2025-03-10' }, 'Audit_Production_2025.pdf')).toBe(true);
  });
  it('CSI: customer + year', () => {
    const row = { clientName: 'CHEMANOL', yr: 2025 };
    expect(hit('csi', row, 'FM-CSS-01_CHEMANOL_2025.pdf')).toBe(true);
    expect(hit('csi', row, 'FM-CSS-01_CHEMANOL_2024.pdf')).toBe(false);
  });
  it('Objectives: department + year', () => {
    expect(hit('objectives', { dept: 'OPERATIONS', yr: 2026 }, 'PT-OBJ-04 OPERATIONS QUALITY OBJECTIVE 2026.docx')).toBe(true);
  });
  it('Audit: area + year', () => {
    expect(hit('audit', { dep: 'Production', dt: '2025-03-10' }, 'Internal Audit Report_Production_2025.pdf')).toBe(true);
  });
  it('TUV: "tuv" + year taken from the record date', () => {
    const row = { num: 'NC-05', due: '2025-06-30' };
    expect(hit('tuv', row, 'TUV audit findings 2025.pdf')).toBe(true);
    expect(hit('tuv', row, 'TUV audit findings 2024.pdf')).toBe(false);
    expect(rowKeys('tuv', { num: 'NC-05' })).toEqual([]);
  });
  it('MRM: words + year', () => {
    expect(hit('mrm', { meetingDate: '2025-12-20' }, 'MRM Minutes 2025.pdf')).toBe(true);
  });
  it('a row with an empty key field never auto-matches', () => {
    expect(rowKeys('csi', { clientName: '', yr: 2025 })).toEqual([]);
    expect(rowKeys('ncr', { project: 'AR-RAZI' })).toEqual([]);
  });
  it('a text key shorter than 4 characters never auto-matches', () => {
    expect(rowKeys('objectives', { dept: 'OPS', yr: 2026 })).toEqual([]);
    expect(rowKeys('audit', { dep: 'P&E', dt: '2025-03-10' })).toEqual([]);
    expect(rowKeys('csi', { clientName: 'ABC', yr: 2025 })).toEqual([]);
  });
  it('a key only matches on a token boundary (no longer number or word around it)', () => {
    expect(hit('ncr', { ref: 'NCR-001' }, 'NCR-001 signed.pdf')).toBe(true);
    expect(hit('ncr', { ref: 'NCR-001' }, 'NCR-0010 signed.pdf')).toBe(false);
    expect(hit('audit', { ref: 'IA-01' }, 'Audit IA-01 report.pdf')).toBe(true);
    expect(hit('audit', { ref: 'IA-01' }, 'Audit IA-010 report.pdf')).toBe(false);
    const dcr = { dcrNo: 'DCR-001' };
    expect(hit('dcr', dcr, 'DOCUMENT CHANGE REQUEST 001.pdf')).toBe(true);
    expect(hit('dcr', dcr, 'DOCUMENT CHANGE REQUEST 2001.pdf')).toBe(false);
    expect(hit('dcr', dcr, 'DOCUMENT CHANGE REQUEST 0012.pdf')).toBe(false);
  });
  it('every tab has at least one W: folder', () => {
    for (const r of Object.values(RULES)) expect(r.folders.length).toBeGreaterThan(0);
  });
});
