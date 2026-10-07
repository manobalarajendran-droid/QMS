import { Clock, User as UserIcon } from 'lucide-react';
import type { NCRRecord } from '../../store/useNCRStore';
import { VARIANT_STYLES } from '../shared/statusBadgeUtils';
import { CLASSIFICATION_STYLES, calculateSLA, classificationOf } from './ncrShared';

/** One NCR in the board column. The whole card is a button that opens the record. */
export function NCRCard({ record, onOpen }: { record: NCRRecord; onOpen: () => void }) {
  const sla = calculateSLA(record);
  const classification = classificationOf(record);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-text-primary group-hover:text-accent-text">{record.ref || 'No number'}</span>
        {sla && (
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${VARIANT_STYLES[sla.variant]}`}>
            <Clock className="h-3 w-3" aria-hidden="true" />
            {sla.daysLeft >= 0 ? `${sla.daysLeft}d left` : `${-sla.daysLeft}d late`}
          </span>
        )}
      </div>
      <p className="mb-2 line-clamp-2 text-[13px] text-text-secondary">{record.desc || 'No description yet'}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-text-secondary">
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${CLASSIFICATION_STYLES[classification]}`}>{classification}</span>
        {record.project && <span className="max-w-[140px] truncate">{record.project}</span>}
      </div>
      {(record.assignedTo || record.assignedDept) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11.5px] text-text-secondary">
          {record.assignedTo && (
            <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" aria-hidden="true" />{record.assignedTo}</span>
          )}
          {record.assignedDept && <span className="truncate">{record.assignedDept}</span>}
        </div>
      )}
    </button>
  );
}
