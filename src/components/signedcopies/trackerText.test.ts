import { describe, expect, it } from 'vitest';
import { trackerText } from './trackerText';

describe('trackerText', () => {
  it('W: offline: says it cannot count', () => {
    expect(trackerText(null)).toEqual({ main: "Can't count, W: offline", sub: '' });
  });
  it('shows X of Y and the not-linked files', () => {
    expect(trackerText({ signed: 12, missing: 3, notLinked: 2 }))
      .toEqual({ main: '12 of 15 signed', sub: '3 missing · 2 files not linked' });
  });
  it('all signed, nothing loose', () => {
    expect(trackerText({ signed: 4, missing: 0, notLinked: 0 })).toEqual({ main: '4 of 4 signed', sub: '' });
  });
  it('no rows at all', () => {
    expect(trackerText({ signed: 0, missing: 0, notLinked: 1 })).toEqual({ main: 'No rows yet', sub: '1 file not linked' });
  });
});
