// One box in the yearly QMS set grid: a document for a department and year.
import { Eye, FilePlus2, Loader2 } from 'lucide-react';
import { navigate } from '../../lib/router';
import type { CellState } from './annualSet';
import type { WFile } from './wfilesApi';

interface AnnualSetCellProps {
  state: CellState;
  busyId: string | null;
  onOpen: (f: WFile) => void;
  onSubmitNew: () => void;
}

const chip = 'inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold';
const linkBtn = 'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-text hover:bg-accent-subtle disabled:opacity-60';

export function AnnualSetCell({ state, busyId, onOpen, onSubmitNew }: AnnualSetCellProps) {
  if (state.kind === 'na') return <span className="text-[11px] text-text-tertiary">Not needed</span>;

  if (state.kind === 'onW') {
    const f = state.files[0];
    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`${chip} bg-success-subtle text-success-text`}>On W:</span>
        <button onClick={() => onOpen(f)} disabled={busyId !== null} title={f.id} className={linkBtn}>
          {busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Open
          {state.files.length > 1 && <span className="font-normal text-text-tertiary">(+{state.files.length - 1})</span>}
        </button>
      </div>
    );
  }

  if (state.kind === 'approved' || state.kind === 'submitted') {
    const approved = state.kind === 'approved';
    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`${chip} ${approved ? 'bg-warning-subtle text-warning-text' : 'bg-accent-subtle text-accent-text'}`}>
          {approved ? 'Approved: copy to W:' : `Sent (${state.dcr.status})`}
        </span>
        <button onClick={() => navigate('dcr_workflow', state.dcr.id)} className={linkBtn}>
          {state.dcr.dcrNo || 'Open DCR'}
        </button>
      </div>
    );
  }

  const lastYear = state.lastYear;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`${chip} bg-danger-subtle text-danger-text`}>Missing</span>
      <button onClick={onSubmitNew} className={linkBtn}
        title={lastYear ? `Last year's file is linked: ${lastYear.name}` : 'No file for last year was found on W:'}>
        <FilePlus2 className="h-3 w-3" /> Submit new
      </button>
      {lastYear && (
        <button onClick={() => onOpen(lastYear)} disabled={busyId !== null} className={`${linkBtn} text-text-tertiary`}>
          {busyId === lastYear.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Last year
        </button>
      )}
    </div>
  );
}
