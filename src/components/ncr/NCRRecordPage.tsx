import { useState } from 'react';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import type { NCRRecord, NCRRecordStatus } from '../../store/useNCRStore';
import { useNCRStore } from '../../store/useNCRStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { NCRForm } from './NCRForm';
import { NCRStageBody } from './NCRStageBody';
import { NCRHistory } from './NCRHistory';
import { NCRMoreMenu, type MenuItem } from './NCRMoreMenu';
import { NCREditDialog } from './NCREditDialog';
import { NCRReasonDialog } from './NCRReasonDialog';
import { CLASSIFICATION_STYLES, STATUSES, STATUS_LABELS, calculateSLA, classificationOf, stageIndex } from './ncrShared';

const VERIFY_STAGE = 5;
const CLOSED_STAGE = 6;
const REOPEN_TO: NCRRecordStatus = 'CAPA_InProgress';

type Ask = null | { kind: 'forward' | 'reject' | 'reopen'; to: NCRRecordStatus };

function StageChips({ status }: { status: NCRRecordStatus }) {
  const at = stageIndex(status);
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Stages">
      {STATUSES.map((s, i) => {
        const state = i < at ? 'done' : i === at ? 'current' : 'later';
        const cls = state === 'current'
          ? 'border-accent bg-accent text-accent-fg'
          : state === 'done' ? 'border-success/40 bg-success-subtle text-success-text' : 'border-border bg-surface text-text-secondary';
        return (
          <li key={s} aria-current={state === 'current' ? 'step' : undefined} className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium ${cls}`}>
            {state === 'done' && <Check className="h-3 w-3" aria-hidden="true" />}
            <span className="sr-only">{state === 'done' ? 'Done: ' : state === 'current' ? 'Now: ' : 'Later: '}</span>
            {STATUS_LABELS[s]}
          </li>
        );
      })}
    </ol>
  );
}

/** One NCR on its own page. The next step is the big button; rare actions sit under "More". */
export function NCRRecordPage({ record, onBack }: { record: NCRRecord; onBack: () => void }) {
  const me = useCurrentUser();
  const isMR = me.role === 'admin' || me.role === 'qa_manager';
  const canEdit = me.can.canEdit && (isMR || me.role === 'department_spoc');
  const canDelete = me.can.canDelete;
  const [editing, setEditing] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [ask, setAsk] = useState<Ask>(null);

  const stage = stageIndex(record.status);
  const next = stage < VERIFY_STAGE ? STATUSES[stage + 1] : null;
  const prev = stage > 0 && stage < CLOSED_STAGE ? STATUSES[stage - 1] : null;
  const sla = calculateSLA(record);
  const cls = classificationOf(record);
  const by = me.name || 'Unknown user';
  const store = useNCRStore.getState;

  const more: MenuItem[] = [
    { label: 'Evidence files', onSelect: () => setEvidence(true) },
    { label: 'Print', onSelect: () => window.print() },
    ...(isMR && prev ? [{ label: `Send back to ${STATUS_LABELS[prev]}`, onSelect: () => setAsk({ kind: 'reject', to: prev }) }] : []),
    ...(isMR && stage === CLOSED_STAGE ? [{ label: 'Reopen', onSelect: () => setAsk({ kind: 'reopen', to: REOPEN_TO }) }] : []),
    ...(canEdit ? [{ label: record.isArchived ? 'Bring back from archive' : 'Archive', onSelect: () => store().updateRecord(record.id, { isArchived: !record.isArchived }) }] : []),
    ...(canDelete ? [{
      label: 'Delete NCR', danger: true,
      onSelect: () => { if (window.confirm(`Delete ${record.ref || 'this NCR'}? This cannot be undone.`)) { store().deleteRecord(record.id); onBack(); } },
    }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="sticky top-0 z-20 -mx-4 mb-4 space-y-2 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur print:static">
        <nav aria-label="Breadcrumb" className="text-[12.5px] text-text-secondary">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> NCR / CAPA
          </button>
          <span aria-hidden="true"> › </span><span>{record.ref || 'No number'}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-text-primary">{record.ref || 'No number'}</h1>
          <span className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${CLASSIFICATION_STYLES[cls]}`}>{cls}</span>
          {sla && sla.daysLeft < 0 && <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-[11.5px] font-semibold text-danger-text">{-sla.daysLeft} days late</span>}
          {record.isArchived && <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11.5px] text-text-secondary">Archived</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
            {canEdit && stage < CLOSED_STAGE && (
              <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Edit
              </button>
            )}
            <NCRMoreMenu items={more} />
            {isMR && next && (
              <button type="button" onClick={() => setAsk({ kind: 'forward', to: next })} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                Move to {STATUS_LABELS[next]} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <StageChips status={record.status} />
        {!isMR && stage < VERIFY_STAGE && <p className="text-[12px] text-text-secondary">A QA manager moves the NCR to the next stage.</p>}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NCRStageBody record={record} canEdit={canEdit} canVerify={isMR} me={by} />
        <NCRHistory record={record} />
      </div>

      {ask && (
        <NCRReasonDialog
          title={ask.kind === 'forward' ? `Move to ${STATUS_LABELS[ask.to]}` : ask.kind === 'reject' ? `Send back to ${STATUS_LABELS[ask.to]}` : 'Reopen this NCR'}
          confirmLabel={ask.kind === 'forward' ? 'Move on' : ask.kind === 'reject' ? 'Send back' : 'Reopen'}
          hint="The reason is saved in the history so others can see why."
          danger={ask.kind !== 'forward'}
          onCancel={() => setAsk(null)}
          onConfirm={(reason) => { store().transitionStatus(record.id, ask.to, by, reason, ask.kind); setAsk(null); }}
        />
      )}
      {evidence && <EvidencePanel entityType="ncr" entityId={record.id} projectId={record.project || record.id} open onClose={() => setEvidence(false)} />}
      {editing && (
        <NCREditDialog
          title={`Edit ${record.ref}`}
          onClose={() => setEditing(false)}
        >
          <NCRForm initial={record} onCancel={() => setEditing(false)} onSubmit={(data) => { store().updateRecord(record.id, data); setEditing(false); }} />
        </NCREditDialog>
      )}
    </div>
  );
}
