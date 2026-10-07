// "QMS files (W:)" screen: every file in the Master QMS Repository, READ ONLY,
// served by the laptop helper. To change a
// document, people raise a DCR (Document changes screen) - files here never change.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, Folder, ChevronDown, ChevronRight, Search, FileText, RefreshCw, Loader2, FilePen } from 'lucide-react';
import { navigate } from '../../lib/router';
import { saveDCRPrefill } from './dcrPrefill';
import { EvidenceViewer } from '../evidence/EvidenceViewer';
import { evidenceViewKind } from '../evidence/evidenceFileRules';
import { fetchFile, getHost, listFiles, type WFile } from './wfilesApi';

type Stage = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function sizeText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Groups files by their top folder, keeping the W: order (00, 01, ...). */
function groupByTop(files: WFile[]): [string, WFile[]][] {
  const groups = new Map<string, WFile[]>();
  for (const f of files) {
    const top = f.folder.split('/')[0] || '(main folder)';
    groups.set(top, [...(groups.get(top) ?? []), f]);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

interface LoadResult { stage: Stage; files: WFile[] }

/** Reads the W: file list from the laptop helper. */
async function readFiles(): Promise<LoadResult> {
  try {
    await getHost(true);
    return { stage: { kind: 'ready' }, files: await listFiles() };
  } catch (e) {
    return { stage: { kind: 'error', message: e instanceof Error ? e.message : 'Could not load the files.' }, files: [] };
  }
}

export function WFilesPage() {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [files, setFiles] = useState<WFile[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ blob: Blob; name: string } | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const apply = useCallback((r: LoadResult) => {
    setFiles(r.files);
    setStage(r.stage);
  }, []);

  const load = useCallback(() => {
    setStage({ kind: 'loading' });
    void readFiles().then(apply);
  }, [apply]);

  useEffect(() => {
    let live = true;
    void readFiles().then((r) => { if (live) apply(r); });
    return () => { live = false; };
  }, [apply]);

  const shown = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return files;
    return files.filter((f) => {
      const text = `${f.id} ${f.docNo ?? ''}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [files, search]);
  const groups = useMemo(() => groupByTop(shown), [shown]);
  const searching = search.trim().length > 0;

  const openFile = async (f: WFile) => {
    setBusyId(f.id);
    setOpenError(null);
    try {
      const blob = await fetchFile(f.id);
      if (evidenceViewKind(f.name) === 'none') saveBlob(blob, f.name);
      else setViewing({ blob, name: f.name });
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : 'Could not open the file.');
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">QMS files (W:)</h1>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          Master QMS Repository, view only. To change a document, press Propose change on it: this raises a DCR where you attach the new version.
        </p>
      </div>
      <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
      </button>
    </div>
  );

  if (stage.kind === 'loading') {
    return <div className="flex flex-col gap-4">{header}<p className="flex items-center gap-2 text-[12.5px] text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> Loading files…</p></div>;
  }
  if (stage.kind === 'error') {
    return <div className="flex flex-col gap-4">{header}<p className="rounded-xl border border-border/60 bg-surface p-4 text-[12.5px] text-danger-text" role="alert">{stage.message}</p></div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div className="relative max-w-xl">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, folder or document number (e.g. PT-QA-05)…"
          aria-label="Search files"
          className="w-full rounded-xl border border-border/60 bg-surface py-1.5 pl-8 pr-3 text-[12.5px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <p className="text-[11px] text-text-tertiary">{shown.length} of {files.length} files</p>
      {openError && <p className="text-[12px] text-danger-text" role="alert">{openError}</p>}
      <div className="flex flex-col gap-2">
        {groups.map(([top, list]) => {
          const isOpen = searching || !!open[top];
          return (
            <section key={top} className="rounded-xl border border-border/60 bg-surface">
              <button onClick={() => setOpen((o) => ({ ...o, [top]: !o[top] }))} aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-text-primary hover:bg-surface-hover">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {isOpen ? <FolderOpen className="h-4 w-4 text-accent" /> : <Folder className="h-4 w-4 text-accent" />}
                <span className="flex-1">{top}</span>
                <span className="text-[11px] font-normal text-text-tertiary">{list.length}</span>
              </button>
              {isOpen && (
                <ul className="border-t border-border/40">
                  {list.map((f) => (
                    <li key={f.id} className="flex items-center hover:bg-surface-hover">
                      <button onClick={() => void openFile(f)} disabled={busyId !== null}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left disabled:opacity-60">
                        {busyId === f.id ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-text-primary">{f.name}</span>
                          <span className="block truncate text-[10.5px] text-text-tertiary">{f.folder.split('/').slice(1).join(' / ') || top}</span>
                        </span>
                        {f.docNo && <span className="shrink-0 rounded-md bg-accent-subtle px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-text">{f.docNo}</span>}
                        <span className="hidden shrink-0 text-[10.5px] text-text-tertiary sm:block">{sizeText(f.size)} · {f.at.slice(0, 10)}</span>
                      </button>
                      <button onClick={() => { saveDCRPrefill(f); navigate('dcr_workflow'); }}
                        title="Propose a new version of this document (raises a DCR)" aria-label={`Propose change to ${f.name}`}
                        className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-semibold text-accent-text hover:bg-accent-subtle">
                        <FilePen className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden md:inline">Propose change</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {groups.length === 0 && <p className="text-[12.5px] text-text-tertiary">No files match.</p>}
      </div>
      {viewing && (
        <EvidenceViewer blob={viewing.blob} fileName={viewing.name}
          onClose={() => setViewing(null)} onDownload={() => saveBlob(viewing.blob, viewing.name)} />
      )}
    </div>
  );
}
