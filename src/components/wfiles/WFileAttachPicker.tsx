// "Attach W: file" box for the evidence panel. Finds a file on the W: list and
// hands it back. The panel saves only a link to it (no copy of the file).
import { useMemo, useState } from 'react';
import { FolderOpen, Link2, Loader2 } from 'lucide-react';
import type { WFile } from './wfilesApi';
import { useWFiles } from './useWFiles';

const MAX_RESULTS = 8;
const MIN_QUERY_LENGTH = 2;

interface Props {
  onPick: (file: WFile) => void;
  busy: boolean;
}

export function WFileAttachPicker({ onPick, busy }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const { state, files } = useWFiles(expanded);

  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (query.trim().length < MIN_QUERY_LENGTH) return [];
    return files
      .filter((f) => {
        const text = `${f.name} ${f.folder}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, MAX_RESULTS);
  }, [files, query]);

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover">
        <FolderOpen className="h-3.5 w-3.5" /> Attach W: file (link, no copy)
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-accent" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a document number or name, e.g. QSP-MR-02"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary" />
        <button type="button" onClick={() => { setExpanded(false); setQuery(''); }}
          className="text-xs text-text-tertiary hover:text-text-secondary">Close</button>
      </div>
      {state.kind === 'loading' && (
        <p className="flex items-center gap-2 text-xs text-text-tertiary"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading W:…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-xs text-text-tertiary">W: is not reachable now ({state.message}). The laptop helper may be off.</p>
      )}
      {state.kind === 'ready' && query.trim().length >= MIN_QUERY_LENGTH && matches.length === 0 && (
        <p className="text-xs text-text-tertiary">No W: file matches “{query.trim()}”.</p>
      )}
      <div className="space-y-0.5">
        {matches.map((f) => (
          <button key={f.id} type="button" disabled={busy} onClick={() => onPick(f)}
            title={`${f.folder}\\${f.name}`}
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
