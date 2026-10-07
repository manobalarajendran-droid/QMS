import { describe, expect, it } from 'vitest';
import { emptyCardNote, rowFileView } from './rowFileView';
import type { RowFile } from './resolveSignedCopies';

const base: RowFile = { file: { id: 'f1', name: 'a.pdf' } as RowFile['file'], fileName: 'a.pdf', how: 'auto', old: false, missingOnW: false };

describe('rowFileView', () => {
  it('auto match: labelled auto, can say "Not this one"', () => {
    expect(rowFileView(base)).toEqual({ note: 'auto', tone: 'ok', action: 'not_this_one', actionLabel: 'Not this one' });
  });
  it('hand link: can unlink', () => {
    expect(rowFileView({ ...base, how: 'hand', linkId: 'L1' })).toMatchObject({ note: 'linked by hand', action: 'unlink', actionLabel: 'Unlink' });
  });
  it('old copy is muted', () => {
    expect(rowFileView({ ...base, old: true })).toMatchObject({ note: 'Older copy', tone: 'muted' });
  });
  it('a linked file no longer on W: is orange and can be unlinked', () => {
    expect(rowFileView({ ...base, file: null, how: 'hand', linkId: 'L1', missingOnW: true }))
      .toEqual({ note: 'This file is no longer on W:', tone: 'warn', action: 'unlink', actionLabel: 'Unlink' });
  });
  it('helper offline: hand link shown by name, still can unlink', () => {
    expect(rowFileView({ ...base, file: null, how: 'hand', linkId: 'L1' }))
      .toMatchObject({ note: 'linked by hand (W: offline)', tone: 'muted', action: 'unlink' });
  });
});

describe('emptyCardNote', () => {
  it('reachable W: with no file is red', () => {
    expect(emptyCardNote('ready')).toEqual({ text: 'No signed copy on W:', tone: 'missing' });
  });
  it('offline W: says the helper may be off', () => {
    expect(emptyCardNote('error')).toEqual({ text: 'W: not reachable now. The laptop helper may be off.', tone: 'muted' });
  });
  it('loading shows nothing yet', () => {
    expect(emptyCardNote('loading')).toBeNull();
  });
});
