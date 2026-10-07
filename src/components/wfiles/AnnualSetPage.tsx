// "Yearly QMS set" screen: for each department, this year's Quality Objectives,
// Issue Log, Risk Register and Opportunity Register. Shows what is already on W:
// (view only), what was sent for approval, and what is still missing. "Submit new"
// raises a DCR where the owner attaches the new file; after approval the MR copies
// it into W: by hand (W: is never written by the app).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { navigate } from '../../lib/router';
import { useAuth } from '../../hooks/useAuth';
import { useDCRStore } from '../../store/useDCRStore';
import { EvidenceViewer } from '../evidence/EvidenceViewer';
import { evidenceViewKind } from '../evidence/evidenceFileRules';
import { WFilePinBox } from './WFilePinBox';
import { AnnualSetCell } from './AnnualSetCell';
import { ANNUAL_DEPTS, ANNUAL_DOCS, annualKey, cellState, type AnnualDept, type AnnualDoc, type CellState } from './annualSet';
import { saveDCRPrefillData } from './dcrPrefill';
import { fetchFile, PinNeededError, readWFiles, saveBlob, type WFile, type WFilesLoad } from './wfilesApi';

const FIRST_YEAR = 2024;

function yearOptions(now: number): number[] {
  const list: number[] = [];
  for (let y = now + 1; y >= FIRST_YEAR; y--) list.push(y);
  return list;
}

/** The DCR department name for a row (the combined MR row files under "MR"). */
const dcrDept = (d: AnnualDept) => (d.skip ? 'MR' : d.name);

export function AnnualSetPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [load, setLoad] = useState<WFilesLoad | { kind: 'loading' }>({ kind: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ blob: Blob; name: string } | null>(null);
  const dcrs = useDCRStore((s) => s.records);
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const reload = useCallback(() => {
    setLoad({ kind: 'loading' });
    void readWFiles().then(setLoad);
  }, []);

  useEffect(() => {
    let live = true;
    void readWFiles().then((r) => { if (live) setLoad(r); });
    return () => { live = false; };
  }, []);

  const files = useMemo(() => (load.kind === 'ready' ? load.files : []), [load]);
  const grid = useMemo(
    () => ANNUAL_DEPTS.map((dept) => ({ dept, cells: ANNUAL_DOCS.map((doc) => cellState(files, dcrs, doc, dept, year)) })),
    [files, dcrs, year],
  );
  const count = (kind: CellState['kind']) => grid.reduce((n, r) => n + r.cells.filter((c) => c.kind === kind).length, 0);
  const needed = grid.reduce((n, r) => n + r.cells.filter((c) => c.kind !== 'na').length, 0);

  const openFile = async (f: WFile) => {
    setBusyId(f.id);
    setOpenError(null);
    try {
      const blob = await fetchFile(f.id);
      if (evidenceViewKind(f.name) === 'none') saveBlob(blob, f.name);
      else setViewing({ blob, name: f.name });
    } catch (e) {
      if (e instanceof PinNeededError) { reload(); return; }
      setOpenError(e instanceof Error ? e.message : 'Could not open the file.');
    } finally {
      setBusyId(null);
    }
  };

  const submitNew = (doc: AnnualDoc, dept: AnnualDept, lastYear: WFile | null) => {
    saveDCRPrefillData({
      docNo: doc.docNo,
      title: `${doc.label} ${dept.name} ${year}`,
      wFileId: lastYear?.id ?? '',
      department: dcrDept(dept),
      reason: `Yearly ${doc.label} for ${year}. Attach the new ${year} file in "Document files" after saving.`,
      annualKey: annualKey(doc.key, dept.name, year),
    });
    navigate('dcr_workflow');
  };

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">Yearly QMS set</h1>
        <p className="mt-0.5 max-w-2xl text-[11px] text-text-tertiary">
          Each department sends a new Quality Objectives, Issue Log, Risk Register and Opportunity Register every year.
          Press Submit new to raise a DCR and attach the file. After approval the MR copies it into W:.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year"
          className="rounded-xl border border-border/60 bg-surface px-2 py-1.5 text-[12.5px] text-text-primary">
          {yearOptions(thisYear).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={reload} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>
    </div>
  );

  if (load.kind !== 'ready') {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {load.kind === 'loading' && <p className="flex items-center gap-2 text-[12.5px] text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> Loading W: files…</p>}
        {load.kind === 'error' && <p className="rounded-xl border border-border/60 bg-surface p-4 text-[12.5px] text-danger-text" role="alert">{load.message}</p>}
        {load.kind === 'pin' && <WFilePinBox status={load.status} onUnlocked={reload} />}
      </div>
    );
  }

  const missing = count('missing');
  const approved = count('approved');
  return (
    <div className="flex flex-col gap-3">
      {header}
      <p className={`rounded-xl px-3 py-2 text-[12px] ${missing ? 'bg-warning-subtle text-warning-text' : 'bg-success-subtle text-success-text'}`}>
        {year}: {count('onW')} of {needed} on W:, {count('submitted')} sent for approval, {missing} missing.
        {missing > 0 && ' Department owners: please submit your new version for this year.'}
        {isMR && approved > 0 && ` ${approved} approved and waiting for you to copy into W: (old file to 99 - Obsolete).`}
      </p>
      {openError && <p className="text-[12px] text-danger-text" role="alert">{openError}</p>}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-border/40 text-[11px] text-text-tertiary">
              <th className="px-3 py-2 font-semibold">Department</th>
              {ANNUAL_DOCS.map((d) => <th key={d.key} className="px-3 py-2 font-semibold">{d.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ dept, cells }) => (
              <tr key={dept.name} className="border-b border-border/30 align-top last:border-0">
                <td className="px-3 py-2 text-[12.5px] font-semibold text-text-primary">{dept.name}</td>
                {cells.map((state, i) => (
                  <td key={ANNUAL_DOCS[i].key} className="px-3 py-2">
                    <AnnualSetCell state={state} busyId={busyId} onOpen={(f) => void openFile(f)}
                      onSubmitNew={() => submitNew(ANNUAL_DOCS[i], dept, state.kind === 'missing' ? state.lastYear : null)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-tertiary">
        Found by file name and year in W: (03 - Quality Objectives, and the Issues Log, Risk Register and Opportunity Register folders under 06 - Records).
      </p>
      {viewing && (
        <EvidenceViewer blob={viewing.blob} fileName={viewing.name}
          onClose={() => setViewing(null)} onDownload={() => saveBlob(viewing.blob, viewing.name)} />
      )}
    </div>
  );
}
