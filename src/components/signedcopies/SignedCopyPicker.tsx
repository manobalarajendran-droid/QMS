// Small picker: this tab's own W: files with a search box.
import { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { WFile } from '../wfiles/wfilesApi';
import type { SignedTab } from './matchRules';
import { pickerFiles } from './pickerFilter';

const MAX_SHOWN = 50;

interface Props { tab: SignedTab; files: WFile[]; busy: boolean; onPick: (file: WFile) => void }

export function SignedCopyPicker({ tab, files, busy, onPick }: Props) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => pickerFiles(tab, files, query), [tab, files, query]);
  return (
    <div className="mt-2 rounded-lg border border-border p-3">
      <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search file name"
        className="mb-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary" />
      {shown.length === 0 && <p className="text-xs text-text-tertiary">No files in the W: folder for this tab match.</p>}
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {shown.slice(0, MAX_SHOWN).map((f) => (
          <button key={f.id} type="button" disabled={busy} onClick={() => onPick(f)} title={`${f.folder}\\${f.name}`}
            className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover disabled:opacity-60">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-xs text-text-primary">{f.name}</span>
            <span className="shrink-0 text-[10.5px] text-text-tertiary">{f.at.slice(0, 10)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
