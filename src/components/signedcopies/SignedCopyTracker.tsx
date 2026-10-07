// List-screen line: "X of Y signed", plus the W: files in this tab's folder that match no row (or many rows).
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { roleHasPermission } from '../../lib/permissions';
import { useWFileOpener } from '../wfiles/useWFileOpener';
import { WFileButton } from '../wfiles/WFileOpen';
import type { SignedTab } from './matchRules';
import { trackerLine } from './trackerText';
import { useTabSignedCopies } from './useTabSignedCopies';

interface Props<R extends { id: string }> { tab: SignedTab; records: ReadonlyArray<R>; rowLabel: (r: R) => string }

const REASON = { no_row: 'Matches no row', many_rows: 'Matches more than one row' } as const;

export function SignedCopyTracker<R extends { id: string }>({ tab, records, rowLabel }: Props<R>) {
  const sc = useTabSignedCopies(tab, records);
  const opener = useWFileOpener();
  const canEdit = roleHasPermission(useAuthStore((s) => s.currentUser)?.role, 'canEdit');
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Record<string, string>>({});
  if (sc.filesState === 'loading') return <p className="text-xs text-text-tertiary print:hidden">Counting signed copies…</p>;
  const t = trackerLine(sc.resolved.counts, sc.linksState, sc.linksError);
  const loose = sc.resolved.notLinked;

  return (
    <div className="text-sm print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{t.main}</span>
        {t.sub && <span className="text-xs text-text-tertiary">{t.sub}</span>}
        {loose.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline">
            {open ? 'Hide' : 'Show'} not-linked files
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-2 max-h-60 overflow-y-auto space-y-1.5 bg-surface rounded-xl border border-border p-3">
          {loose.map((n) => (
            <li key={n.file.id} className="flex flex-wrap items-center gap-2">
              <WFileButton file={n.file} opener={opener} />
              <span className="text-xs text-text-tertiary">{REASON[n.reason]}</span>
              {canEdit && (
                <span className="ml-auto flex items-center gap-1">
                  <select aria-label={`Row for ${n.file.name}`} value={pick[n.file.id] ?? ''}
                    onChange={(e) => setPick((p) => ({ ...p, [n.file.id]: e.target.value }))}
                    className="text-xs border border-border rounded px-1 py-0.5 bg-surface">
                    <option value="">Pick a row…</option>
                    {records.map((r) => <option key={r.id} value={r.id}>{rowLabel(r)}</option>)}
                  </select>
                  <button type="button" disabled={sc.busy || !pick[n.file.id]}
                    onClick={() => void sc.link(pick[n.file.id], n.file)}
                    className="text-xs text-accent hover:underline disabled:opacity-50">Link</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {sc.linksError && sc.linksState !== 'error' && <p className="mt-1 text-xs text-red-600">{sc.linksError}</p>}
      {opener.error && <p className="mt-1 text-xs text-red-600">{opener.error}</p>}
      {opener.viewer}
    </div>
  );
}
