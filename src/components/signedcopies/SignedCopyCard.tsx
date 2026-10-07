// "Signed copy" card for one row: its W: files, plus Link / Unlink / Not this one for editors.
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { roleHasPermission } from '../../lib/permissions';
import { useWFileOpener } from '../wfiles/useWFileOpener';
import { useWFiles } from '../wfiles/useWFiles';
import { WFileButton } from '../wfiles/WFileOpen';
import type { SignedTab } from './matchRules';
import { emptyCardNote, rowFileView } from './rowFileView';
import { SignedCopyPicker } from './SignedCopyPicker';
import { useTabSignedCopies } from './useTabSignedCopies';

const TONE = { ok: 'text-text-secondary', warn: 'text-orange-600', muted: 'text-text-tertiary' } as const;

interface Props { tab: SignedTab; records: ReadonlyArray<{ id: string }>; rowId: string }

export function SignedCopyCard({ tab, records, rowId }: Props) {
  const sc = useTabSignedCopies(tab, records);
  const w = useWFiles();
  const opener = useWFileOpener();
  const canEdit = roleHasPermission(useAuthStore((s) => s.currentUser)?.role, 'canEdit');
  const [picking, setPicking] = useState(false);
  const files = sc.resolved.byRow[rowId] ?? [];
  const empty = files.length === 0 ? emptyCardNote(sc.filesState) : null;

  return (
    <section className="bg-surface rounded-xl border border-border p-4 print:hidden" aria-label="Signed copy">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Signed copy</h3>
        {canEdit && sc.filesState === 'ready' && (
          <button type="button" onClick={() => setPicking((p) => !p)} className="text-xs text-accent hover:underline">
            {picking ? 'Close' : 'Link a file'}
          </button>
        )}
      </div>
      {sc.filesState === 'loading' && <p className="text-xs text-text-tertiary">Looking on W:…</p>}
      {empty && <p className={`text-xs ${empty.tone === 'missing' ? 'text-red-600' : 'text-text-tertiary'}`}>{empty.text}</p>}
      <ul className="space-y-1.5">
        {files.map((rf) => {
          const v = rowFileView(rf);
          return (
            <li key={rf.linkId ?? rf.file?.id ?? rf.fileName} className="flex items-center gap-2 text-sm">
              {rf.file ? <WFileButton file={rf.file} opener={opener} /> : <span className="truncate">{rf.fileName}</span>}
              <span className={`text-xs ${TONE[v.tone]}`}>{v.note}</span>
              {canEdit && v.action && (
                <button type="button" disabled={sc.busy} className="ml-auto text-xs text-text-secondary hover:underline disabled:opacity-50"
                  onClick={() => (v.action === 'unlink' ? sc.unlink(rf.linkId!) : rf.file && sc.link(rowId, rf.file, 'not_this_one'))}>
                  {v.actionLabel}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {picking && (
        <SignedCopyPicker tab={tab} files={w.files} busy={sc.busy} onPick={(f) => { void sc.link(rowId, f); setPicking(false); }} />
      )}
      {sc.linksError && <p className="mt-2 text-xs text-red-600">{sc.linksError}</p>}
      {opener.error && <p className="mt-2 text-xs text-red-600">{opener.error}</p>}
      {opener.viewer}
    </section>
  );
}
