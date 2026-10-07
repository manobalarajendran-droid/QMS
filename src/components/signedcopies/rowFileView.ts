// Words, colour and button for one file on a row's signed-copy card.
import type { RowFile } from './resolveSignedCopies';

export interface RowFileView {
  note: string;
  tone: 'ok' | 'warn' | 'muted';
  action: 'unlink' | 'not_this_one' | null;
  actionLabel: string;
}

export function rowFileView(rf: RowFile): RowFileView {
  const byHand = rf.how === 'hand' && !!rf.linkId;
  const action = byHand ? 'unlink' : rf.how === 'auto' ? 'not_this_one' : null;
  const actionLabel = action === 'unlink' ? 'Unlink' : action === 'not_this_one' ? 'Not this one' : '';
  if (rf.missingOnW) return { note: 'This file is no longer on W:', tone: 'warn', action, actionLabel };
  if (!rf.file) return { note: 'linked by hand (W: offline)', tone: 'muted', action, actionLabel };
  if (rf.old) return { note: 'Older copy', tone: 'muted', action, actionLabel };
  return { note: byHand ? 'linked by hand' : 'auto', tone: 'ok', action, actionLabel };
}

/** What the card says when a row has no files at all. */
export function emptyCardNote(filesState: 'loading' | 'ready' | 'error'): { text: string; tone: 'missing' | 'muted' } | null {
  if (filesState === 'ready') return { text: 'No signed copy on W:', tone: 'missing' };
  if (filesState === 'error') return { text: 'W: not reachable now. The laptop helper may be off.', tone: 'muted' };
  return null;
}
