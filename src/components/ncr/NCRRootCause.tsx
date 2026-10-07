import { useState } from 'react';
import type { NCRRecord } from '../../store/useNCRStore';
import { useNCRStore } from '../../store/useNCRStore';
import { inputCls } from './ncrShared';

const WHY_COUNT = 5;
const WHYS_MARK = '\n\n5-Whys:\n';

/** The rca field holds "notes" + "5-Whys:" + "Why N: ..." lines. Split it back out. */
function parseRca(rca: string | undefined): { notes: string; whys: string[] } {
  const [notes, list] = (rca || '').split(WHYS_MARK);
  const whys = Array.from({ length: WHY_COUNT }, () => '');
  for (const line of (list || '').split('\n')) {
    const m = line.match(/^Why (\d+): (.*)$/);
    const idx = m ? parseInt(m[1], 10) - 1 : -1;
    if (m && idx >= 0 && idx < WHY_COUNT) whys[idx] = m[2];
  }
  return { notes: notes || '', whys };
}

function joinRca(notes: string, whys: string[]): string {
  const lines = whys.map((w, i) => (w.trim() ? `Why ${i + 1}: ${w}` : '')).filter(Boolean).join('\n');
  return notes + (lines ? WHYS_MARK + lines : '');
}

/** Five whys plus notes. Editable by a department SPOC or QA manager. */
export function NCRRootCause({ record, editable }: { record: NCRRecord; editable: boolean }) {
  const start = parseRca(record.rca);
  const [notes, setNotes] = useState(start.notes);
  const [whys, setWhys] = useState(start.whys);
  const [saved, setSaved] = useState(false);
  const dirty = joinRca(notes, whys) !== (record.rca || '');

  const save = () => {
    useNCRStore.getState().updateRecord(record.id, { rca: joinRca(notes, whys) });
    setSaved(true);
  };

  return (
    <div className="space-y-3">
      {whys.map((why, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <label htmlFor={`why-${record.id}-${idx}`} className="w-14 shrink-0 pt-2 text-[12.5px] font-semibold text-accent-text">
            Why {idx + 1}?
          </label>
          <textarea
            id={`why-${record.id}-${idx}`}
            className={inputCls}
            rows={1}
            value={why}
            disabled={!editable}
            onChange={(e) => { setSaved(false); setWhys((cur) => cur.map((w, i) => (i === idx ? e.target.value : w))); }}
          />
        </div>
      ))}
      <div>
        <label htmlFor={`rca-notes-${record.id}`} className="mb-1 block text-[12px] font-medium text-text-secondary">Other notes</label>
        <textarea id={`rca-notes-${record.id}`} className={inputCls} rows={2} value={notes} disabled={!editable} onChange={(e) => { setSaved(false); setNotes(e.target.value); }} />
      </div>
      {editable ? (
        <div className="flex items-center justify-end gap-3">
          <span role="status" className="text-[12px] text-text-secondary">{saved && !dirty ? 'Saved.' : dirty ? 'Not saved yet.' : ''}</span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Save root cause
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-text-secondary">Only a department SPOC or QA manager can fill in the root cause.</p>
      )}
    </div>
  );
}
