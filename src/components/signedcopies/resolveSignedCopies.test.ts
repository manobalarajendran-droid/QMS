import { describe, it, expect } from 'vitest';
import { resolveSignedCopies, matches, type LinkNote } from './resolveSignedCopies';
import type { WFile } from '../wfiles/wfilesApi';

const F = '06 - Records (Owner-Controlled, Audit Read)/Customer Records (MKT + GM)';
const file = (id: string, name: string, folder = F): WFile => ({ id, name, folder, size: 1, at: '2025-01-01', docNo: null });
const rowA = { id: 'a', groups: [['chemanol'], ['2025']] };
const rowB = { id: 'b', groups: [['sadaf'], ['2025']] };
const link = (p: Partial<LinkNote>): LinkNote => ({ id: 'L1', tab: 'csi', rowId: 'a', wFileId: 'f9', fileName: 'x.pdf', kind: 'link', ...p });

describe('matches', () => {
  it('needs every group, any key within a group', () => {
    expect(matches([['a1b2'], ['2025', '2026']], 'A1-B2 report 2026.pdf')).toBe(true);
    expect(matches([['a1b2'], ['2025']], 'A1-B2 report 2026.pdf')).toBe(false);
  });
  it('never matches empty groups or empty keys', () => {
    expect(matches([], 'anything.pdf')).toBe(false);
    expect(matches([['']], 'anything.pdf')).toBe(false);
  });
});

describe('resolveSignedCopies', () => {
  it('auto-links a file that matches exactly one row', () => {
    const r = resolveSignedCopies('csi', [rowA, rowB], [file('f1', 'FM-CSS-01_CHEMANOL_2025.pdf')], []);
    expect(r.byRow.a[0]).toMatchObject({ how: 'auto', fileName: 'FM-CSS-01_CHEMANOL_2025.pdf' });
    expect(r.counts).toEqual({ signed: 1, missing: 1, notLinked: 0 });
  });
  it('a file matching two rows is not auto-linked and goes to Not linked', () => {
    const r = resolveSignedCopies('csi', [rowA, { id: 'c', groups: [['chemanol'], ['2025']] }], [file('f1', 'CHEMANOL 2025.pdf')], []);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked).toEqual([{ file: expect.objectContaining({ id: 'f1' }), reason: 'many_rows' }]);
  });
  it('a hand link wins, and that file is not auto-linked elsewhere', () => {
    const r = resolveSignedCopies('csi', [rowA, rowB], [file('f1', 'CHEMANOL_2025.pdf')], [link({ rowId: 'b', wFileId: 'f1' })]);
    expect(r.byRow.b[0]).toMatchObject({ how: 'hand', linkId: 'L1' });
    expect(r.byRow.a).toEqual([]);
  });
  it('"not this one" blocks the auto match', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025.pdf')], [link({ wFileId: 'f1', kind: 'not_this_one' })]);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked[0].reason).toBe('no_row');
  });
  it('obsolete files are shown as old and never count', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025 OBSOLETE.pdf')], []);
    expect(r.byRow.a[0].old).toBe(true);
    expect(r.counts?.signed).toBe(0);
  });
  it('an obsolete file matching no row is not listed as Not linked', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'OTHERCLIENT_2025 SUPERSEDED.pdf')], []);
    expect(r.notLinked).toEqual([]);
  });
  it('an obsolete file matching two rows is not listed as Not linked either', () => {
    const r = resolveSignedCopies('csi', [rowA, { id: 'c', groups: [['chemanol'], ['2025']] }], [file('f1', 'CHEMANOL 2025 OBSOLETE.pdf')], []);
    expect(r.notLinked).toEqual([]);
  });
  it('files outside the tab folders are ignored', () => {
    const r = resolveSignedCopies('csi', [rowA], [file('f1', 'CHEMANOL_2025.pdf', '00 - Foundation (All Employees - Read)')], []);
    expect(r.byRow.a).toEqual([]);
    expect(r.notLinked).toEqual([]);
  });
  it('helper offline: counts are null, hand links still listed by name', () => {
    const r = resolveSignedCopies('csi', [rowA], null, [link({ fileName: 'saved.pdf' })]);
    expect(r.counts).toBeNull();
    expect(r.byRow.a[0]).toMatchObject({ file: null, fileName: 'saved.pdf', missingOnW: false });
  });
  it('a linked file no longer on W: is flagged but still counts', () => {
    const r = resolveSignedCopies('csi', [rowA], [], [link({ fileName: 'gone.pdf' })]);
    expect(r.byRow.a[0]).toMatchObject({ file: null, missingOnW: true });
    expect(r.counts?.signed).toBe(1);
  });
  it('a row with no keys never auto-matches', () => {
    const r = resolveSignedCopies('csi', [{ id: 'z', groups: [] }], [file('f1', 'anything.pdf')], []);
    expect(r.byRow.z).toEqual([]);
  });
});
