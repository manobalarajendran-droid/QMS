import { useMemo, useState } from 'react';
import { ClipboardList, Plus, SearchX } from 'lucide-react';
import { useNCRStore } from '../../store/useNCRStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useRouteRecord } from '../../lib/router';
import { EmptyState } from '../shared/EmptyState';
import { NCRCard } from './NCRCard';
import { NCRForm } from './NCRForm';
import { NCRRecordPage } from './NCRRecordPage';
import { NCRFilters, EMPTY_FILTERS, applyFilters, type NCRFilterState } from './NCRFilters';
import { CLASSIFICATIONS, STATUSES, STATUS_LABELS, classificationOf, normaliseDept, stageIndex } from './ncrShared';

const NEW_ID = 'new';

function NewNCRPage({ onDone }: { onDone: (id: string | null) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-2 text-[12.5px] text-text-secondary">
        <button type="button" onClick={() => onDone(null)} className="rounded hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">NCR / CAPA</button>
        <span aria-hidden="true"> › </span>New
      </nav>
      <h1 className="mb-4 text-xl font-semibold text-text-primary">Raise an NCR</h1>
      <div className="rounded-xl border border-border bg-surface p-5">
        <NCRForm
          onCancel={() => onDone(null)}
          onSubmit={(data) => {
            const created = useNCRStore.getState().addRecord({
              ...data,
              auditeeDept: normaliseDept(data.auditeeDept),
              assignedDept: normaliseDept(data.assignedDept),
              status: 'Open',
            });
            onDone(created.id);
          }}
        />
      </div>
    </div>
  );
}

/** NCR / CAPA screen. The list is a board by stage; #/ncr/<id> opens one record, #/ncr/new raises one. */
export function NCRWorkflow() {
  const records = useNCRStore((s) => s.records);
  const role = useCurrentUser().role;
  const canRaise = role === 'admin' || role === 'qa_manager' || role === 'department_spoc';
  const [recordId, setRecordId] = useRouteRecord('deviations');
  const [filters, setFilters] = useState<NCRFilterState>(EMPTY_FILTERS);

  const assignees = useMemo(
    () => Array.from(new Set(records.map((r) => r.assignedTo).filter(Boolean) as string[])).sort(),
    [records],
  );
  const tabCounts = useMemo(() => {
    const base = applyFilters(records, { ...filters, cls: 'All' });
    const counts: Record<string, number> = { All: base.length };
    for (const c of CLASSIFICATIONS) counts[c] = base.filter((r) => classificationOf(r) === c).length;
    return counts;
  }, [records, filters]);
  const visible = useMemo(() => applyFilters(records, filters), [records, filters]);

  if (recordId === NEW_ID) return <NewNCRPage onDone={setRecordId} />;
  if (recordId) {
    const record = records.find((r) => r.id === recordId);
    if (record) return <NCRRecordPage record={record} onBack={() => setRecordId(null)} />;
    return (
      <EmptyState
        icon={<SearchX className="h-8 w-8" />}
        title="NCR not found"
        hint="It may have been deleted, or it has not loaded yet. Go back to the list and search for it."
        action={{ label: 'Back to NCR list', onClick: () => setRecordId(null) }}
      />
    );
  }

  const raise = canRaise ? { label: 'Raise NCR', onClick: () => setRecordId(NEW_ID) } : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">NCR / CAPA</h1>
          <p className="text-[12.5px] text-text-secondary">Each column is a stage. Open a card to see what to do next.</p>
        </div>
        {raise && (
          <button type="button" onClick={raise.onClick} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> Raise NCR
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No NCRs yet"
          hint={canRaise ? 'When an audit or check finds a problem, raise an NCR here so it gets a fix and an owner.' : 'NCRs raised by your QA team will show here.'}
          action={raise}
        />
      ) : (
        <>
          <div role="tablist" aria-label="Kind" className="flex flex-wrap gap-1">
            {(['All', ...CLASSIFICATIONS] as const).map((c) => {
              const on = filters.cls === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilters({ ...filters, cls: c })}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? 'bg-accent text-accent-fg' : 'bg-surface-secondary text-text-secondary hover:text-text-primary'}`}
                >
                  {c === 'All' ? 'All' : c} <span className="tabular-nums opacity-80">{tabCounts[c] ?? 0}</span>
                </button>
              );
            })}
          </div>
          <NCRFilters value={filters} onChange={setFilters} assignees={assignees} />

          {visible.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-8 w-8" />}
              title="Nothing matches these filters"
              hint="Clear the filters to see every NCR again."
              action={{ label: 'Clear filters', onClick: () => setFilters(EMPTY_FILTERS) }}
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STATUSES.map((status, i) => {
                const cards = visible.filter((r) => stageIndex(r.status) === i);
                return (
                  <section key={status} aria-label={`${STATUS_LABELS[status]}: ${cards.length}`} className="w-64 shrink-0 rounded-xl bg-surface-secondary/60 p-2">
                    <h2 className="mb-2 flex items-center justify-between px-1 text-[12.5px] font-semibold text-text-primary">
                      {STATUS_LABELS[status]}
                      <span className="rounded-full bg-surface px-2 text-[11.5px] tabular-nums text-text-secondary">{cards.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {cards.map((r) => <NCRCard key={r.id} record={r} onOpen={() => setRecordId(r.id)} />)}
                      {cards.length === 0 && <p className="px-1 py-3 text-[12px] text-text-secondary">None at this stage.</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
