import { useState } from 'react';
import { CheckCircle, Undo2 } from 'lucide-react';
import type { NCRRecord } from '../../store/useNCRStore';
import { useNCRStore } from '../../store/useNCRStore';
import { ActionPlanTable, type ActionPlanRow } from '../shared/ActionPlanTable';
import { inputCls } from './ncrShared';

type Field = 'description' | 'owner' | 'targetDate' | 'completionDate';

/** Which record field each action-plan cell writes to. */
const FIELD_MAP: Record<ActionPlanRow['key'], Record<Field, keyof NCRRecord>> = {
  containment: { description: 'containmentAction', owner: 'containmentBy', targetDate: 'containmentTargetDate', completionDate: 'containmentDate' },
  corrective: { description: 'corrAction', owner: 'corrBy', targetDate: 'corrTargetDate', completionDate: 'corrCompletionDate' },
  preventive: { description: 'prevAction', owner: 'prevBy', targetDate: 'prevTargetDate', completionDate: 'prevCompletionDate' },
};

function rowsOf(r: NCRRecord): ActionPlanRow[] {
  return [
    { key: 'containment', label: 'Quick fix (containment)', description: r.containmentAction, owner: r.containmentBy, targetDate: r.containmentTargetDate, completionDate: r.containmentDate },
    { key: 'corrective', label: 'Corrective action', description: r.corrAction, owner: r.corrBy, targetDate: r.corrTargetDate, completionDate: r.corrCompletionDate },
    { key: 'preventive', label: 'Preventive action', description: r.prevAction, owner: r.prevBy, targetDate: r.prevTargetDate, completionDate: r.prevCompletionDate },
  ];
}

export function NCRActionPlan({ record, editable }: { record: NCRRecord; editable: boolean }) {
  const onChange = (key: ActionPlanRow['key'], field: Field, value: string) => {
    useNCRStore.getState().updateRecord(record.id, { [FIELD_MAP[key][field]]: value } as Partial<NCRRecord>);
  };
  return (
    <ActionPlanTable rows={rowsOf(record)} editable={editable} entityId={record.id} projectId={record.project || record.id} onChange={onChange} />
  );
}

/** QA manager closes the NCR or sends it back to the actions stage. A reason is required. */
export function NCRVerify({ record, canVerify, by }: { record: NCRRecord; canVerify: boolean; by: string }) {
  const [reason, setReason] = useState('');
  if (!canVerify) {
    return <p className="text-[13px] text-text-secondary">Waiting for a QA manager to check the actions and close this NCR.</p>;
  }
  const ok = reason.trim().length > 0;
  const act = (fn: 'approveNCR' | 'rejectNCR') => {
    useNCRStore.getState()[fn](record.id, by, reason.trim());
    setReason('');
  };
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`verify-${record.id}`} className="mb-1 block text-[12px] font-medium text-text-secondary">
          What did you check? <span className="text-danger-text" aria-hidden="true">*</span>
        </label>
        <textarea id={`verify-${record.id}`} className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-required="true" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ok}
          onClick={() => act('approveNCR')}
          className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" /> It worked: close NCR
        </button>
        <button
          type="button"
          disabled={!ok}
          onClick={() => act('rejectNCR')}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Not yet: send back to actions
        </button>
      </div>
      {!ok && <p className="text-[12px] text-text-secondary">Write what you checked to turn on the buttons.</p>}
    </div>
  );
}
