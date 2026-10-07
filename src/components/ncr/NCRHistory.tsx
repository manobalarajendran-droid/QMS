import type { NCRRecord } from '../../store/useNCRStore';
import { CommentThread } from '../shared/CommentThread';
import { STATUS_LABELS } from './ncrShared';

const KIND_WORD: Record<string, string> = {
  forward: 'Moved on',
  reject: 'Sent back',
  reopen: 'Reopened',
  verify: 'Checked',
};

function when(at: string): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Right-hand column: who moved the NCR and why, then the comments. */
export function NCRHistory({ record }: { record: NCRRecord }) {
  const items = [...(record.stateHistory ?? [])].reverse();
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface p-4" aria-labelledby={`hist-${record.id}`}>
        <h2 id={`hist-${record.id}`} className="mb-3 text-[13px] font-semibold text-text-primary">History</h2>
        <ol className="space-y-3">
          {items.map((h, i) => (
            <li key={`${h.at}-${i}`} className="border-l-2 border-border pl-3">
              <p className="text-[12.5px] text-text-primary">
                <span className="font-semibold">{KIND_WORD[h.kind] ?? h.kind}</span>: {STATUS_LABELS[h.from] ?? h.from} → {STATUS_LABELS[h.to] ?? h.to}
              </p>
              {h.reason && <p className="text-[12.5px] text-text-secondary">“{h.reason}”</p>}
              <p className="text-[11.5px] text-text-secondary">{h.by} · {when(h.at)}</p>
            </li>
          ))}
          <li className="border-l-2 border-border pl-3">
            <p className="text-[12.5px] text-text-primary"><span className="font-semibold">Raised</span>{record.raisedBy ? ` by ${record.raisedBy}` : ''}</p>
            {record.createdAt && <p className="text-[11.5px] text-text-secondary">{when(record.createdAt)}</p>}
          </li>
        </ol>
      </section>
      <section className="rounded-xl border border-border bg-surface p-4 print:hidden" aria-label="Comments">
        <h2 className="mb-3 text-[13px] font-semibold text-text-primary">Comments</h2>
        <CommentThread entityType="ncr" entityId={record.id} projectId={record.project || record.id} />
      </section>
    </div>
  );
}
