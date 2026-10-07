import { Search } from 'lucide-react';
import type { NCRRecord } from '../../store/useNCRStore';
import { NCR_DEPARTMENTS, calculateSLA, classificationOf, normaliseDept, type Classification } from './ncrShared';

export type SortKey = 'newest' | 'oldest' | 'sla' | 'ref';

export interface NCRFilterState {
  cls: 'All' | Classification;
  dept: string;
  assignee: string;
  overdueOnly: boolean;
  showArchived: boolean;
  search: string;
  sort: SortKey;
}

export const EMPTY_FILTERS: NCRFilterState = {
  cls: 'All', dept: 'All', assignee: 'All', overdueOnly: false, showArchived: false, search: '', sort: 'newest',
};

const ctl = 'rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-[12.5px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function time(s: string | undefined): number {
  const t = s ? new Date(s).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

/** Apply every filter except the classification tab (so tab counts stay honest). */
export function applyFilters(records: NCRRecord[], f: NCRFilterState): NCRRecord[] {
  const q = f.search.trim().toLowerCase();
  const list = records.filter((r) => {
    if (!f.showArchived && r.isArchived) return false;
    if (f.cls !== 'All' && classificationOf(r) !== f.cls) return false;
    if (f.dept !== 'All' && normaliseDept(r.assignedDept) !== f.dept && normaliseDept(r.auditeeDept) !== f.dept) return false;
    if (f.assignee !== 'All' && r.assignedTo !== f.assignee) return false;
    if (f.overdueOnly) {
      const sla = calculateSLA(r);
      if (!sla || sla.daysLeft >= 0) return false;
    }
    if (q && ![r.ref, r.desc, r.project, r.assignedTo].some((v) => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  return [...list].sort((a, b) => {
    if (f.sort === 'oldest') return time(a.createdAt) - time(b.createdAt);
    if (f.sort === 'ref') return (a.ref || '').localeCompare(b.ref || '');
    if (f.sort === 'sla') return (calculateSLA(a)?.daysLeft ?? Infinity) - (calculateSLA(b)?.daysLeft ?? Infinity);
    return time(b.createdAt) - time(a.createdAt);
  });
}

interface Props {
  value: NCRFilterState;
  onChange: (next: NCRFilterState) => void;
  assignees: string[];
}

/** Search, department, person, sort and two switches, in one quiet row. */
export function NCRFilters({ value: f, onChange, assignees }: Props) {
  const set = <K extends keyof NCRFilterState>(k: K, v: NCRFilterState[K]) => onChange({ ...f, [k]: v });
  return (
    <div className="flex flex-wrap items-center gap-2" role="search">
      <label className="relative min-w-[180px] flex-1">
        <span className="sr-only">Search NCRs</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <input type="search" value={f.search} onChange={(e) => set('search', e.target.value)} placeholder="Search number, text, person…" className={`${ctl} w-full pl-8`} />
      </label>
      <label>
        <span className="sr-only">Department</span>
        <select value={f.dept} onChange={(e) => set('dept', e.target.value)} className={ctl}>
          <option value="All">All departments</option>
          {NCR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      {assignees.length > 0 && (
        <label>
          <span className="sr-only">Assigned to</span>
          <select value={f.assignee} onChange={(e) => set('assignee', e.target.value)} className={ctl}>
            <option value="All">Anyone</option>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      )}
      <label>
        <span className="sr-only">Sort</span>
        <select value={f.sort} onChange={(e) => set('sort', e.target.value as SortKey)} className={ctl}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="sla">Due soonest</option>
          <option value="ref">By number</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
        <input type="checkbox" checked={f.overdueOnly} onChange={(e) => set('overdueOnly', e.target.checked)} className="accent-[var(--color-accent)]" />
        Late only
      </label>
      <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
        <input type="checkbox" checked={f.showArchived} onChange={(e) => set('showArchived', e.target.checked)} className="accent-[var(--color-accent)]" />
        Show archived
      </label>
    </div>
  );
}
