import { describe, expect, it } from 'vitest';
import { pickerFiles } from './pickerFilter';
import { RULES } from './matchRules';
import type { WFile } from '../wfiles/wfilesApi';

const f = (id: string, name: string, folder: string): WFile => ({ id, name, folder, size: 1, at: '2026-01-01', docNo: null });
const ncrDir = RULES.ncr.folders[0];
const files = [
  f('1', 'NCR-001 Signed.pdf', ncrDir),
  f('2', 'ncr-002 signed.pdf', `${ncrDir}/2026`),
  f('3', 'NCR-003.pdf', RULES.dcr.folders[0]),
  f('4', 'Other.pdf', `${ncrDir}X`),
];

describe('pickerFiles', () => {
  it('keeps only the tab folders and their sub-folders', () => {
    expect(pickerFiles('ncr', files, '').map((x) => x.id)).toEqual(['1', '2']);
  });
  it('filters by name, case-insensitive', () => {
    expect(pickerFiles('ncr', files, 'NCR-002').map((x) => x.id)).toEqual(['2']);
    expect(pickerFiles('ncr', files, 'SIGNED').map((x) => x.id)).toEqual(['1', '2']);
  });
  it('returns nothing when the search matches nothing', () => {
    expect(pickerFiles('ncr', files, 'zzz')).toEqual([]);
  });
});
