import { useId, useState, type ReactNode } from 'react';
import type { NCRRecord } from '../../store/useNCRStore';
import { useNCRStore } from '../../store/useNCRStore';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { generateDocNo } from '../../lib/idGenerator';
import {
  CLASSIFICATIONS,
  NCR_DEPARTMENTS,
  OBSERVATION_SUBTYPES,
  RCA_CATEGORIES,
  inputCls,
  normaliseDept,
  type Classification,
} from './ncrShared';

export interface NCRFormData {
  ref: string;
  project: string;
  raisedBy: string;
  auditeeName: string;
  auditeeDept: string;
  refDoc: string;
  auditeeEmail: string;
  classification: Classification;
  obSubType: string;
  desc: string;
  objEvidence: string;
  rcaCat: string;
  assignedTo: string;
  assignedDept: string;
  slaDeadline: string;
}

/** Label with an optional red star for required fields. */
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-danger-text" aria-hidden="true">*</span>}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-[11.5px] text-text-secondary">{hint}</p>}
    </div>
  );
}

function DeptSelect({ id, value, onChange, required }: { id: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const v = normaliseDept(value);
  return (
    <select id={id} className={inputCls} value={v} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">Choose a department</option>
      {NCR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
      {v && !NCR_DEPARTMENTS.includes(v) && <option value={v}>{v}</option>}
    </select>
  );
}

function initialData(initial: NCRRecord | undefined, nextRef: string, myName: string): NCRFormData {
  return {
    ref: initial?.ref ?? nextRef,
    project: initial?.project ?? '',
    raisedBy: initial?.raisedBy ?? myName,
    auditeeName: initial?.auditeeName ?? '',
    auditeeDept: normaliseDept(initial?.auditeeDept),
    refDoc: initial?.refDoc ?? '',
    auditeeEmail: initial?.auditeeEmail ?? '',
    classification: (initial?.classification as Classification) ?? 'NCR',
    obSubType: initial?.obSubType ?? '',
    desc: initial?.desc ?? '',
    objEvidence: initial?.objEvidence ?? '',
    rcaCat: initial?.rcaCat ?? '',
    assignedTo: initial?.assignedTo ?? '',
    assignedDept: normaliseDept(initial?.assignedDept),
    slaDeadline: initial?.slaDeadline ?? '',
  };
}

interface NCRFormProps {
  initial?: NCRRecord;
  onCancel: () => void;
  onSubmit: (data: NCRFormData) => void;
}

/** Raise or edit an NCR. Required fields carry a star; the number fills itself in. */
export function NCRForm({ initial, onCancel, onSubmit }: NCRFormProps) {
  const records = useNCRStore((s) => s.records);
  const members = useTeamMembers();
  const me = useCurrentUser();
  const [f, setF] = useState<NCRFormData>(() =>
    initialData(initial, generateDocNo('NCR', new Date().getFullYear(), records, 'ref'), me.name),
  );
  const set = <K extends keyof NCRFormData>(k: K, v: NCRFormData[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const isObservation = f.classification === 'Observation';

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-5">
      <p className="text-[12px] text-text-secondary"><span className="text-danger-text" aria-hidden="true">*</span> marks a required field.</p>

      <fieldset>
        <legend className="mb-2 text-[12px] font-medium text-text-secondary">Type of finding</legend>
        <div className="flex flex-wrap gap-4">
          {CLASSIFICATIONS.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-sm text-text-primary">
              <input type="radio" name="classification" checked={f.classification === opt} onChange={() => set('classification', opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="NCR number" required hint="Filled in for you. Change it only if the paper copy has a different number.">
          {(id) => <input id={id} className={inputCls} value={f.ref} onChange={(e) => set('ref', e.target.value)} required />}
        </Field>
        <Field label="Project, client or site" required>
          {(id) => <input id={id} className={inputCls} value={f.project} onChange={(e) => set('project', e.target.value)} required />}
        </Field>
        <Field label="Raised by" required>
          {(id) => <input id={id} className={inputCls} value={f.raisedBy} onChange={(e) => set('raisedBy', e.target.value)} required />}
        </Field>
        <Field label="Department where it was found" required>
          {(id) => <DeptSelect id={id} value={f.auditeeDept} onChange={(v) => set('auditeeDept', v)} required />}
        </Field>
        <Field label="Person spoken to (auditee)">
          {(id) => <input id={id} className={inputCls} value={f.auditeeName} onChange={(e) => set('auditeeName', e.target.value)} />}
        </Field>
        <Field label="Auditee email">
          {(id) => <input id={id} type="email" className={inputCls} value={f.auditeeEmail} onChange={(e) => set('auditeeEmail', e.target.value)} />}
        </Field>
        <Field label="Procedure or ISO clause">
          {(id) => <input id={id} className={inputCls} value={f.refDoc} onChange={(e) => set('refDoc', e.target.value)} placeholder="e.g. 8.5.1" />}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Assigned to" required hint={members.length ? undefined : 'Team list not loaded. Type the name.'}>
          {(id) => members.length ? (
            <select id={id} className={inputCls} value={f.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} required>
              <option value="">Choose a person</option>
              {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              {f.assignedTo && !members.some((m) => m.name === f.assignedTo) && <option value={f.assignedTo}>{f.assignedTo}</option>}
            </select>
          ) : (
            <input id={id} className={inputCls} value={f.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} required />
          )}
        </Field>
        <Field label="Owner department" required>
          {(id) => <DeptSelect id={id} value={f.assignedDept} onChange={(v) => set('assignedDept', v)} required />}
        </Field>
        <Field label="Due date" hint="Leave empty to use the standard time for this type.">
          {(id) => <input id={id} type="date" className={inputCls} value={f.slaDeadline} onChange={(e) => set('slaDeadline', e.target.value)} />}
        </Field>
      </div>

      {isObservation && (
        <fieldset>
          <legend className="mb-2 text-[12px] font-medium text-text-secondary">Kind of observation</legend>
          <div className="flex flex-wrap gap-4">
            {OBSERVATION_SUBTYPES.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-sm text-text-primary">
                <input type="radio" name="obSubType" checked={f.obSubType === opt} onChange={() => set('obSubType', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="What was found" required>
        {(id) => <textarea id={id} className={inputCls} rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} required />}
      </Field>
      <Field label="Evidence seen" required hint="What you saw: document number, photo, record, place.">
        {(id) => <textarea id={id} className={inputCls} rows={2} value={f.objEvidence} onChange={(e) => set('objEvidence', e.target.value)} required />}
      </Field>

      {!isObservation && (
        <fieldset>
          <legend className="mb-2 text-[12px] font-medium text-text-secondary">Likely cause type (can be set later)</legend>
          <div className="flex flex-wrap gap-4">
            {RCA_CATEGORIES.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-1.5 text-sm text-text-primary">
                <input type="radio" name="rcaCat" checked={f.rcaCat === opt} onChange={() => set('rcaCat', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Cancel
        </button>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
          {initial ? 'Save changes' : 'Raise NCR'}
        </button>
      </div>
    </form>
  );
}
