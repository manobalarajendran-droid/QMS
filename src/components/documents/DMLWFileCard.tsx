// "File on W:" card in the Document Master List detail panel.
// Shows the real W: file(s) for this DML row (matched by document number),
// warns when W: has no file, and shows when an approved DCR still waits for
// MR to put the new revision on W:.
import { AlertTriangle, CheckCircle2, Clock, FilePen, Loader2, RefreshCw } from 'lucide-react';
import { navigate } from '../../lib/router';
import { saveDCRPrefillData } from '../wfiles/dcrPrefill';
import type { DMLRecord } from '../../store/useDMLStore';
import { useDMLStore } from '../../store/useDMLStore';
import { useWFiles } from '../wfiles/useWFiles';
import { isObsoleteName } from '../wfiles/wfileIndex';
import { WFileButton } from '../wfiles/WFileOpen';
import { useWFileOpener } from '../wfiles/useWFileOpener';

interface Props {
  record: DMLRecord;
  isMR: boolean;
}

export function DMLWFileCard({ record, isMR }: Props) {
  const { state, index, reload } = useWFiles();
  const opener = useWFileOpener();
  const files = index.filesFor(record.no);
  const pending = record.wFilePending;

  const markSwapped = () => {
    if (!window.confirm(`Confirm the new file (Rev ${pending?.rv}) is now on W:?`)) return;
    useDMLStore.getState().updateRecord(record.id, { wFilePending: undefined });
  };

  const proposeChange = () => {
    const current = files.find((f) => !isObsoleteName(f.name));
    saveDCRPrefillData({ docNo: record.no ?? '', title: record.tt ?? '', wFileId: current?.id ?? '', department: record.dept || undefined });
    navigate('dcr_workflow');
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">File on W:</h3>
        <span className="flex-1" />
        <button type="button" onClick={proposeChange} title="Raise a DCR for this document"
          className="mr-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent-text hover:bg-accent-subtle print:hidden">
          <FilePen className="h-3.5 w-3.5" /> Propose change
        </button>
        <button type="button" onClick={reload} title="Read the W: list again"
          className="p-1.5 text-text-tertiary hover:bg-surface-hover rounded-full print:hidden">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {pending && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-subtle p-2.5 text-[12px] text-warning-text">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <b>W: file waiting to be swapped by MR.</b> {pending.dcrNo} was approved on {pending.at.slice(0, 10)}.
            The W: file must be replaced with Rev {pending.rv}.
          </div>
          {isMR && (
            <button type="button" onClick={markSwapped}
              className="shrink-0 rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-text-primary border border-border hover:bg-surface-hover print:hidden">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Done
            </button>
          )}
        </div>
      )}

      {state.kind === 'loading' && (
        <p className="flex items-center gap-2 text-[12px] text-text-tertiary"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading W:…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-[12px] text-text-tertiary">W: is not reachable now ({state.message}). The laptop helper may be off.</p>
      )}
      {state.kind === 'ready' && files.length === 0 && (
        <p className="flex items-center gap-2 text-[12px] text-danger-text">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No file on W: has the number {record.no || '(no number)'}. Put the controlled copy on W:, or fix the number.
        </p>
      )}
      {files.length > 0 && (
        <div className="space-y-0.5">
          {files.map((f) => (
            <WFileButton key={f.id} file={f} opener={opener}
              note={isObsoleteName(f.name) ? 'old copy' : f.at.slice(0, 10)} />
          ))}
        </div>
      )}
      {opener.error && <p className="mt-1 text-[11.5px] text-danger-text">{opener.error}</p>}
      {opener.viewer}
    </div>
  );
}
