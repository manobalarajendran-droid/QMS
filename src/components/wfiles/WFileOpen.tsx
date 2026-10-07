// One clickable W: file line (opens through useWFileOpener).
import { FileText, Loader2 } from 'lucide-react';
import type { WFileOpener, WFileRef } from './useWFileOpener';

/** One clickable W: file line. */
export function WFileButton({ file, opener, note }: { file: WFileRef; opener: WFileOpener; note?: string }) {
  const busy = opener.busyId === file.id;
  return (
    <button type="button" onClick={() => void opener.open(file)} disabled={opener.busyId !== null}
      title={`Open ${file.name}`}
      className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-hover disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-accent" />}
      <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">{file.name}</span>
      {note && <span className="shrink-0 text-[10.5px] text-text-tertiary">{note}</span>}
    </button>
  );
}
