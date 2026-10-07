import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { onSyncConflict, type SyncConflict } from '../../lib/qmsSync';

/** Light notes hide themselves; serious ones stay until the user closes them (L5). */
const HIDE_AFTER_MS = 12_000;
const MAX_SHOWN = 3;

interface Note {
  key: number;
  collection: string;
  kind: SyncConflict['kind'];
  text: string;
  serious: boolean;
}

const KEPT = ' Your own copy was kept in this browser.';

/** Plain words for each kind of sync message. */
function wordsFor(c: SyncConflict): string {
  const n = c.ids.length;
  const recs = n === 1 ? 'this record' : `${n} records`;
  const kept = c.message.includes('put-aside') ? KEPT : '';
  switch (c.kind) {
    case 'changed': return `Someone else changed ${recs} first. Their version is now shown. Check it and make your change again if needed.${kept}`;
    case 'withdrawn': return (n === 1 ? 'A record you had open was removed by someone else.' : `${n} records were removed by someone else.`) + kept;
    case 'withdraw-held': return 'Many records went missing at once, so nothing was removed here. Please tell your QMS admin.';
    case 'refused': return `Your change was not saved: ${c.message.replace(/ Your copy was kept.*$/, '') || 'you may not have the right to do this.'}${kept}`;
    case 'not-saved': return 'Your change is not saved yet (no connection or a server problem). It is kept in this browser and will be tried again. Do not clear this browser’s data.';
    case 'saved': return 'Your earlier change is now saved.';
    default: return c.message;
  }
}

const isSerious = (kind: SyncConflict['kind']) => kind !== 'changed' && kind !== 'saved';

/** Shows sync messages at the bottom of the screen. */
export function SyncConflictBanner() {
  const [notes, setNotes] = useState<Note[]>([]);
  const nextKey = useRef(1);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const live = timers.current;
    const off = onSyncConflict((c) => {
      const note: Note = { key: nextKey.current++, collection: c.collection, kind: c.kind, text: wordsFor(c), serious: isSerious(c.kind) };
      setNotes((prev) => {
        // "Saved now" replaces the "not saved yet" note of the same screen.
        const kept = c.kind === 'saved' ? prev.filter((x) => !(x.kind === 'not-saved' && x.collection === c.collection)) : prev;
        return [...kept, note].slice(-MAX_SHOWN);
      });
      if (note.serious) return;
      const t = window.setTimeout(() => {
        live.delete(t);
        setNotes((prev) => prev.filter((x) => x.key !== note.key));
      }, HIDE_AFTER_MS);
      live.add(t);
    });
    return () => {
      off();
      live.forEach((t) => window.clearTimeout(t));
      live.clear();
    };
  }, []);

  const dismiss = (key: number) => setNotes((prev) => prev.filter((x) => x.key !== key));

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 print:hidden">
      {notes.map((n) => (
        <div
          key={n.key}
          role={n.serious ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border p-3 text-[13px] shadow-xl backdrop-blur ${n.serious ? 'border-danger/40 bg-danger-subtle text-danger-text' : 'border-border bg-surface/95 text-text-primary'}`}
        >
          {n.kind === 'saved'
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <p className="flex-1">{n.text}</p>
          <button
            type="button"
            onClick={() => dismiss(n.key)}
            aria-label="Dismiss message"
            className="-m-1 rounded p-1 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
