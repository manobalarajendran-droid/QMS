// "Document files" box on a DCR: the current file on W: (read only) and the
// proposed new versions people attach. Drafts are kept by the laptop helper in
// its own drafts folder - W: itself is never written. After approval the MR
// copies the approved draft into W: by hand and moves the old file to 99 - Obsolete.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, Loader2, Eye } from 'lucide-react';
import { EvidenceViewer } from '../evidence/EvidenceViewer';
import { evidenceViewKind } from '../evidence/evidenceFileRules';
import { WFilePinBox } from './WFilePinBox';
import { fetchFile, listDrafts, pinStatus, PinNeededError, uploadDraft, type DraftFile, type PinStatus } from './wfilesApi';

interface DCRDraftFilesProps {
  dcrId: string;
  wFileId?: string;
  canUpload: boolean;
  approved: boolean;
  isMR: boolean;
}

type Load = { kind: 'loading' } | { kind: 'ready' } | { kind: 'pin'; status: PinStatus } | { kind: 'error'; message: string };

function errText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const baseName = (id: string) => id.split('/').pop() ?? id;

interface ReadResult { load: Load; drafts: DraftFile[] }

/** Reads the drafts; says "pin" when the helper wants the PIN first. */
async function readDrafts(dcrId: string): Promise<ReadResult> {
  try {
    return { load: { kind: 'ready' }, drafts: await listDrafts(dcrId) };
  } catch (e) {
    return { load: await loadForError(e), drafts: [] };
  }
}

async function loadForError(e: unknown): Promise<Load> {
  if (!(e instanceof PinNeededError)) return { kind: 'error', message: errText(e, 'Could not load the files.') };
  try { return { kind: 'pin', status: await pinStatus() }; }
  catch (e2) { return { kind: 'error', message: errText(e2, 'Could not reach the file helper.') }; }
}

export function DCRDraftFiles({ dcrId, wFileId, canUpload, approved, isMR }: DCRDraftFilesProps) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ blob: Blob; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((r: ReadResult) => {
    setDrafts(r.drafts);
    setLoad(r.load);
  }, []);

  const refresh = useCallback(async () => apply(await readDrafts(dcrId)), [dcrId, apply]);
  const askPinOr = async (e: unknown) => setLoad(await loadForError(e));

  useEffect(() => {
    let live = true;
    void readDrafts(dcrId).then((r) => { if (live) apply(r); });
    return () => { live = false; };
  }, [dcrId, apply]);

  const open = async (id: string, name: string) => {
    setBusy(id);
    setError(null);
    try {
      const blob = await fetchFile(id);
      if (evidenceViewKind(name) === 'none') saveBlob(blob, name);
      else setViewing({ blob, name });
    } catch (e) {
      if (e instanceof PinNeededError) await askPinOr(e);
      else setError(errText(e, 'Could not open the file.'));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy('upload');
    setError(null);
    try {
      await uploadDraft(dcrId, file);
      await refresh();
    } catch (e) {
      if (e instanceof PinNeededError) await askPinOr(e);
      else setError(errText(e, 'Could not upload the file.'));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const rowCls = 'flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover';
  const openBtn = (id: string, name: string) => (
    <button onClick={() => void open(id, name)} disabled={busy !== null}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent-text hover:bg-accent-subtle disabled:opacity-60">
      {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Open
    </button>
  );

  return (
    <section className="bg-surface rounded-xl border border-border p-4 print:hidden">
      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Document files</h3>
      {load.kind === 'loading' && <p className="flex items-center gap-2 text-xs text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
      {load.kind === 'error' && <p className="text-xs text-danger-text" role="alert">{load.message}</p>}
      {load.kind === 'pin' && <WFilePinBox status={load.status} onUnlocked={() => { setLoad({ kind: 'loading' }); void refresh(); }} />}
      {load.kind === 'ready' && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold text-text-secondary">Current file on W: (view only)</p>
            {wFileId ? (
              <div className={rowCls}>
                <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate text-xs text-text-primary" title={wFileId}>{baseName(wFileId)}</span>
                {openBtn(wFileId, baseName(wFileId))}
              </div>
            ) : (
              <p className="px-2 text-xs text-text-tertiary">Not linked. Raise the DCR from QMS files (W:) with Propose change to link the current file.</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold text-text-secondary">Proposed new version</p>
            {drafts.length === 0 && <p className="px-2 text-xs text-text-tertiary">No file attached yet.</p>}
            {drafts.map((d, i) => (
              <div key={d.id} className={rowCls}>
                <FileText className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-text-primary">{d.name}{i === 0 && drafts.length > 1 ? ' (latest)' : ''}</span>
                  <span className="block truncate text-[10.5px] text-text-tertiary">{d.by} · {new Date(d.at).toLocaleString()}</span>
                </span>
                {openBtn(d.id, d.name)}
              </div>
            ))}
            {canUpload && (
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover">
                {busy === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Attach proposed file (PDF, Word, Excel or picture, up to 20 MB)
                <input ref={inputRef} type="file" className="hidden" disabled={busy !== null}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                  onChange={(e) => void upload(e.target.files?.[0])} />
              </label>
            )}
            {!canUpload && !approved && <p className="mt-1 px-2 text-[11px] text-text-tertiary">Files can be attached while the DCR is a Draft.</p>}
          </div>
          {approved && isMR && drafts.length > 0 && (
            <p className="rounded-lg bg-warning-subtle px-3 py-2 text-xs text-warning-text">
              Approved. MR to do by hand: copy the latest proposed file into its W: folder, and move the old file to 99 - Obsolete.
            </p>
          )}
          {error && <p className="text-xs text-danger-text" role="alert">{error}</p>}
        </div>
      )}
      {viewing && (
        <EvidenceViewer blob={viewing.blob} fileName={viewing.name}
          onClose={() => setViewing(null)} onDownload={() => saveBlob(viewing.blob, viewing.name)} />
      )}
    </section>
  );
}
