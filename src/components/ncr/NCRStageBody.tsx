import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import type { NCRRecord } from '../../store/useNCRStore';
import { NCRRootCause } from './NCRRootCause';
import { NCRActionPlan, NCRVerify } from './NCRActions';
import { STAGE_HINTS, STATUS_LABELS, classificationOf, normaliseDept, stageIndex } from './ncrShared';

const STAGE_ROOT_CAUSE = 2;
const STAGE_ACTIONS = 3;
const STAGE_VERIFY = 5;
const STAGE_CLOSED = 6;

function Section({ title, locked, children, highlight }: { title: string; locked?: boolean; highlight?: boolean; children?: ReactNode }) {
  return (
    <section className={`rounded-xl border p-4 ${highlight ? 'border-accent/40 bg-accent-subtle/40' : 'border-border bg-surface'}`}>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-text-primary">
        {locked && <Lock className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />}
        {title}
      </h2>
      {locked ? <p className="text-[13px] text-text-secondary">Opens when the NCR reaches this stage.</p> : children}
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-medium text-text-secondary">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-[13px] text-text-primary">{value || '—'}</dd>
    </div>
  );
}

function Details({ record }: { record: NCRRecord }) {
  const isObs = classificationOf(record) === 'Observation';
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Info label="Raised by" value={record.raisedBy} />
        <Info label="Found in" value={normaliseDept(record.auditeeDept)} />
        <Info label="Auditee" value={record.auditeeName} />
        <Info label="Assigned to" value={record.assignedTo} />
        <Info label="Owner department" value={normaliseDept(record.assignedDept)} />
        <Info label="Procedure / ISO clause" value={record.refDoc} />
        {isObs ? <Info label="Kind of observation" value={record.obSubType} /> : <Info label="Cause type" value={record.rcaCat} />}
        <Info label="Due" value={record.slaDeadline} />
      </dl>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Info label="What was found" value={record.desc} />
        <Info label="Evidence seen" value={record.objEvidence} />
      </dl>
    </div>
  );
}

interface Props {
  record: NCRRecord;
  canEdit: boolean;
  canVerify: boolean;
  me: string;
}

/** The record body: what to do now first, then the details and each stage's part. */
export function NCRStageBody({ record, canEdit, canVerify, me }: Props) {
  const stage = stageIndex(record.status);
  const isClosed = stage >= STAGE_CLOSED;

  return (
    <div className="space-y-4">
      <Section title={`Now: ${STATUS_LABELS[record.status]}`} highlight>
        <p className="text-[13px] text-text-primary">{STAGE_HINTS[record.status]}</p>
        {stage === STAGE_VERIFY && <div className="mt-3"><NCRVerify record={record} canVerify={canVerify} by={me} /></div>}
      </Section>

      <Section title="Details"><Details record={record} /></Section>

      <Section title="Root cause (5 whys)" locked={stage < STAGE_ROOT_CAUSE}>
        <NCRRootCause key={record.id} record={record} editable={canEdit && !isClosed} />
      </Section>

      <Section title="Action plan" locked={stage < 1}>
        {stage < STAGE_ACTIONS && (
          <p className="mb-2 text-[12px] text-text-secondary">Fill in the quick fix now. The corrective and preventive actions are planned after the root cause.</p>
        )}
        <NCRActionPlan record={record} editable={canEdit && !isClosed} />
      </Section>

      {(record.finalDecision || record.verifiedBy) && (
        <Section title="Check result">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Info label="Decision" value={record.finalDecision} />
            <Info label="Checked by" value={record.verifiedBy} />
            <Info label="Date" value={record.verifiedDate} />
          </dl>
        </Section>
      )}
    </div>
  );
}
