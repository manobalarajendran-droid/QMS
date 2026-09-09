import { useState, useMemo, type ReactNode } from 'react';
import { useDMLStore } from '../../store/useDMLStore';
import type { DMLRecord, DMLRecordStatus, DMLStateHistoryEntry } from '../../store/useDMLStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { FileText, ChevronDown, ChevronRight, Search, Filter, Trash, Archive, Plus, Paperclip, MessageSquare, Printer, X, User as UserIcon } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';

const LEVEL_COLOR: Record<string, string> = {
  'L1': 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
  'L2': 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
  'L3': 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
  'L4': 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
};

const LEVEL_LABEL: Record<string, string> = {
  'L1': 'Quality Manual',
  'L2': 'Procedures',
  'L3': 'Work Instructions',
  'L4': 'Forms & Records',
};

// Only the 5 live statuses drive the forward path; legacy 'Active'/'Under Review'
// aliases are never produced by the form or seed data but may still exist on old
// persisted records, so they're normalized for display rather than removed from the type.
const STATUSES: DMLRecordStatus[] = ['Draft', 'UnderReview', 'Approved', 'Published', 'Obsolete'];

const STATUS_LABELS: Record<DMLRecordStatus, string> = {
  Draft: 'Draft',
  UnderReview: 'Under Review',
  Approved: 'Approved',
  Published: 'Published',
  Obsolete: 'Obsolete',
  Active: 'Published',
  'Under Review': 'Under Review',
};

const LEGACY_STATUS_MAP: Partial<Record<DMLRecordStatus, DMLRecordStatus>> = {
  Active: 'Published',
  'Under Review': 'UnderReview',
};

function normalizeStatus(status: DMLRecordStatus): DMLRecordStatus {
  return LEGACY_STATUS_MAP[status] ?? status;
}

function getNextStatus(current: DMLRecordStatus): DMLRecordStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx === -1 || idx === STATUSES.length - 1) return null;
  return STATUSES[idx + 1];
}

function getPrevStatus(current: DMLRecordStatus): DMLRecordStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx <= 0) return null;
  return STATUSES[idx - 1];
}

function isOverdueDML(record: DMLRecord): boolean {
  if (!record.dueDate) return false;
  const status = normalizeStatus(record.status);
  if (status === 'Published' || status === 'Obsolete') return false;
  return new Date(record.dueDate) < new Date(new Date().toDateString());
}

/** Seed reviewDate values are DD-MM-YYYY, which `new Date(string)` misparses as MM-DD-YYYY (or Invalid Date when day > 12). */
function parseDDMMYYYY(value: string): Date | null {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

const inputCls = 'w-full border border-border bg-surface p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm';

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</h4>
      <p className="text-sm text-text-primary whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</span>
      {children}
    </label>
  );
}

function DeptSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {PTA_DEPARTMENTS.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
      {value && !(PTA_DEPARTMENTS as readonly string[]).includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

export function DMLManager() {
  const records = useDMLStore((s) => s.records);
  const addRecord = useDMLStore((s) => s.addRecord);
  const updateRecord = useDMLStore((s) => s.updateRecord);
  const deleteRecord = useDMLStore((s) => s.deleteRecord);

  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'due' | 'no'>('newest');
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({ L1: true, L2: true, L3: false, L4: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DMLRecord | null>(null);

  const assigneeOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.assignedTo).filter(Boolean))) as string[],
    [records]
  );

  const filtered = useMemo(() => {
    let list = records.filter((r) => {
      if (!showArchived && r.isArchived) return false;
      const lvl = r.hierarchyLevel || 'L4';
      if (filterLevel !== 'All' && lvl !== filterLevel) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      if (filterDept !== 'All' && r.dept !== filterDept) return false;
      if (filterAssignee !== 'All' && r.assignedTo !== filterAssignee) return false;
      if (overdueOnly && !isOverdueDML(r)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (r.tt || '').toLowerCase().includes(q) || (r.no || '').toLowerCase().includes(q);
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'no') return (a.no || '').localeCompare(b.no || '');
      if (sortBy === 'due') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });
    return list;
  }, [records, showArchived, filterLevel, filterStatus, filterDept, filterAssignee, overdueOnly, search, sortBy]);

  const byLevel = useMemo(() => {
    const groups: Record<string, DMLRecord[]> = { L1: [], L2: [], L3: [], L4: [] };
    filtered.forEach((r) => {
      const lvl = r.hierarchyLevel || 'L4';
      if (lvl in groups) groups[lvl].push(r);
      else groups['L4'].push(r);
    });
    return groups;
  }, [filtered]);

  const selected = useMemo(() => records.find((r) => r.id === selectedId), [records, selectedId]);

  // Sort order is a view preference, not a filter, so it is deliberately not
  // counted here - the badge has to mean "records are being hidden from you".
  const activeFilterCount =
    (filterLevel !== 'All' ? 1 : 0) +
    (filterStatus !== 'All' ? 1 : 0) +
    (filterDept !== 'All' ? 1 : 0) +
    (filterAssignee !== 'All' ? 1 : 0) +
    (overdueOnly ? 1 : 0) +
    (showArchived ? 1 : 0);

  const clearFilters = () => {
    setFilterLevel('All');
    setFilterStatus('All');
    setFilterDept('All');
    setFilterAssignee('All');
    setOverdueOnly(false);
    setShowArchived(false);
  };


  const toggleLevel = (lvl: string) => setExpandedLevels((p) => ({ ...p, [lvl]: !p[lvl] }));

  const needsReview = records.filter((r) => {
    if (!r.reviewDate) return false;
    const rd = parseDDMMYYYY(r.reviewDate) ?? new Date(r.reviewDate);
    if (Number.isNaN(rd.getTime())) return false;
    const soon = new Date(); soon.setMonth(soon.getMonth() + 2);
    return rd < soon && normalizeStatus(r.status) === 'Published';
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteRecord(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleArchive = (id: string, isArchived: boolean) => {
    updateRecord(id, { isArchived: !isArchived });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left panel */}
      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Document Manager</h2>
          <button onClick={() => { setEditingRecord(null); setShowForm(true); }} className="bg-accent text-accent-fg px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add Doc
          </button>
        </div>

        {needsReview.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠ {needsReview.length} document(s) due for review</div>
            {needsReview.slice(0, 3).map((r) => (
              <div key={r.id} className="text-xs text-warning-text dark:text-amber-400">{r.tt || r.no} — due {r.reviewDate}</div>
            ))}
          </div>
        )}

        {/* One visible control row. The master pane is 384px wide, so the five
            stacked filter rows that used to sit here pushed the document list
            below the fold and clipped every select label ("All Departments"
            did not fit in a third of 384px). Secondary filters now live behind
            the disclosure and stack full-width when opened; the badge reports
            how many are hiding records so a filtered list can never look empty
            for no reason. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search DML..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                activeFilterCount > 0
                  ? 'border-accent bg-accent-subtle text-accent-text'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold tabular-nums text-accent-fg">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-secondary p-2.5">
              <div className="flex gap-2">
                <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
                  aria-label="Filter by hierarchy level"
                  className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="All">All levels</option>
                  <option>L1</option><option>L2</option><option>L3</option><option>L4</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                  className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="All">All statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                aria-label="Filter by department"
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="All">All departments</option>
                {PTA_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
                aria-label="Filter by owner"
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="All">All owners</option>
                {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label="Sort documents"
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="due">Due date soonest</option>
                <option value="no">Doc No. A–Z</option>
              </select>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                  <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
                  Overdue only
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
                  Show archived
                </label>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="ml-auto text-xs font-medium text-accent-text hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {/* Four level groups each printing "No documents." reads as four
              separate failures. One statement, and it says which of the two
              situations you are actually in. */}
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center">
              <p className="text-sm text-text-secondary">
                {records.length === 0 ? 'No documents on the register yet.' : 'No documents match this view.'}
              </p>
              {records.length > 0 && (activeFilterCount > 0 || search) && (
                <button
                  onClick={() => { clearFilters(); setSearch(''); }}
                  className="mt-2 text-xs font-medium text-accent-text hover:underline"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          ) : (
          (['L1', 'L2', 'L3', 'L4'] as const).map((lvl) => (
            <div key={lvl}>
              <button
                onClick={() => toggleLevel(lvl)}
                className="w-full flex items-center gap-2 text-xs font-semibold text-text-secondary py-1"
              >
                {expandedLevels[lvl] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${LEVEL_COLOR[lvl]}`}>{lvl}</span>
                <span>{LEVEL_LABEL[lvl]}</span>
                <span className="ml-auto text-text-tertiary">({byLevel[lvl].length})</span>
              </button>
              {expandedLevels[lvl] && (
                <div className="ml-4 space-y-1">
                  {byLevel[lvl].map((r) => {
                    const overdue = isOverdueDML(r);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                          selectedId === r.id
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-surface hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium text-text-primary line-clamp-2">{r.tt || r.no}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {overdue && <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
                            <StatusBadge status={STATUS_LABELS[normalizeStatus(r.status)] ?? r.status} />
                          </div>
                        </div>
                        {r.no && <span className="text-text-tertiary text-xs">{r.no} {r.isArchived ? '(Archived)' : ''}</span>}
                        {r.assignedTo && <div className="text-text-tertiary text-xs mt-0.5 flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.assignedTo}</div>}
                      </button>
                    );
                  })}
                  {byLevel[lvl].length === 0 && (
                    <p className="text-xs text-text-tertiary px-3 py-1">No documents.</p>
                  )}
                </div>
              )}
            </div>
          )))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a document to view details</p>
            <p className="text-xs mt-1 opacity-60">or use the filters to narrow the list</p>
          </div>
        ) : (
          <DMLDetailPanel
            record={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => { setEditingRecord(selected); setShowForm(true); }}
            onDelete={() => handleDelete(selected.id)}
            onArchive={() => handleArchive(selected.id, !!selected.isArchived)}
          />
        )}
      </div>

      {showForm && (
        <DMLFormModal
          record={editingRecord}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSubmit={(data) => {
            if (editingRecord) {
              updateRecord(editingRecord.id, data);
            } else {
              addRecord({ ...data, status: 'Draft', isArchived: false } as Omit<DMLRecord, 'id' | 'createdAt' | 'updatedAt'>);
            }
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

function DMLDetailPanel({
  record,
  onClose,
  onEdit,
  onDelete,
  onArchive,
}: {
  record: DMLRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [periodicReviewReason, setPeriodicReviewReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionPrompt, setShowRevisionPrompt] = useState(false);
  const [showPeriodicReviewPrompt, setShowPeriodicReviewPrompt] = useState(false);

  const projectId = record.no || record.id;
  const overdue = isOverdueDML(record);
  const normalized = normalizeStatus(record.status);
  const hasApprovalTrail = !!(record.reviewedBy || record.approvedBy || record.rejectedBy);

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-text-primary">{record.tt || record.no}</h2>
            <StatusBadge status={STATUS_LABELS[normalized] ?? record.status} />
            {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <button onClick={onEdit} className="px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors mr-1">
              Edit
            </button>
            <button onClick={() => setShowEvidence(true)} title="Evidence" className="p-2 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button onClick={() => setShowComments((v) => !v)} title="Comments" className="p-2 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button onClick={() => window.print()} title="Print / Export" className="p-2 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onArchive} className="p-2 text-warning-text hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors">
              <Archive className="w-5 h-5" />
            </button>
            <button onClick={onDelete} className="p-2 text-danger-text hover:bg-danger-subtle rounded-full transition-colors">
              <Trash className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 mb-4">
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${LEVEL_COLOR[record.hierarchyLevel || 'L4']}`}>
            {record.hierarchyLevel || 'L4'}
          </span>
          <span className="text-xs text-text-tertiary">{record.no}</span>
          {record.rv && <span className="text-xs text-text-tertiary">Rev. {record.rv}</span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Department" value={record.dept} />
          <InfoField label="ISO Clause" value={record.cl} />
          <InfoField label="Review Date" value={record.reviewDate} />
          <InfoField label="Retention Period" value={record.ret} />
          <InfoField label="Document Owner" value={record.assignedTo} />
          <InfoField label="Due Date" value={record.dueDate} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Notes</h3>
        <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.nt || 'No notes recorded.'}</p>
        <p className="text-xs text-text-tertiary mt-3">
          Action-plan substitution: a document's corrective action is its revision &amp; periodic-review cycle
          (state history and approval trail below), not a CAPA-style containment/correction/prevention table —
          consistent with v12 and this module's actual purpose as a document register.
        </p>
      </div>

      {hasApprovalTrail && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Review / Approval Trail</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {record.reviewedBy && <InfoField label="Reviewed By" value={`${record.reviewedBy}${record.reviewDate ? ` (${record.reviewDate})` : ''}`} />}
            {record.approvedBy && <InfoField label="Approved By" value={`${record.approvedBy}${record.approvalDate ? ` (${record.approvalDate})` : ''}`} />}
            {record.rejectedBy && <InfoField label="Rejected By" value={`${record.rejectedBy}${record.rejectionDate ? ` (${record.rejectionDate})` : ''}`} />}
            {record.rejectionReason && <InfoField label="Rejection Reason" value={record.rejectionReason} />}
          </div>
        </div>
      )}

      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Workflow State</h3>
        <StateTransitionBar
          statuses={STATUSES}
          statusLabels={STATUS_LABELS}
          current={normalized}
          history={record.stateHistory as DMLStateHistoryEntry[] | undefined}
          canAdvance={isMR}
          canVerifyClose={isMR}
          canReopen={isMR}
          onForward={(reason) => {
            const next = getNextStatus(record.status);
            if (next) useDMLStore.getState().transitionStatus(record.id, next, user?.name || 'System', reason, 'forward');
          }}
          onReject={(reason) => {
            const prev = getPrevStatus(record.status);
            if (prev) useDMLStore.getState().transitionStatus(record.id, prev, user?.name || 'System', reason, 'reject');
          }}
          onReopen={(reason) => useDMLStore.getState().transitionStatus(record.id, 'Published', user?.name || 'System', reason, 'reopen')}
        />
        {!isMR && (
          <p className="text-xs text-text-tertiary mt-2">Only Management Representative (Admin / QA Manager) can change this document's workflow stage.</p>
        )}

        {normalized === 'Published' && isMR && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Document Control Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPeriodicReviewPrompt((v) => !v)}
                className="text-xs bg-surface border border-border px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                Trigger Periodic Review
              </button>
              <button
                onClick={() => setShowRevisionPrompt((v) => !v)}
                className="text-xs bg-surface border border-border px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                Create New Revision
              </button>
            </div>
            {showPeriodicReviewPrompt && (
              <div className="bg-surface-secondary border border-border rounded-lg p-3 space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Reason for triggering periodic review (required)</label>
                <textarea rows={2} value={periodicReviewReason} onChange={(e) => setPeriodicReviewReason(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowPeriodicReviewPrompt(false); setPeriodicReviewReason(''); }} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">Cancel</button>
                  <button
                    disabled={!periodicReviewReason.trim()}
                    onClick={() => {
                      useDMLStore.getState().transitionStatus(record.id, 'UnderReview', user?.name || 'System', periodicReviewReason.trim(), 'reopen');
                      setShowPeriodicReviewPrompt(false);
                      setPeriodicReviewReason('');
                    }}
                    className="px-3 py-1.5 text-sm text-accent-fg bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
            {showRevisionPrompt && (
              <div className="bg-surface-secondary border border-border rounded-lg p-3 space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Revision notes / reason (required)</label>
                <textarea rows={2} value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="What changed in this revision?" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowRevisionPrompt(false); setRevisionReason(''); }} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">Cancel</button>
                  <button
                    disabled={!revisionReason.trim()}
                    onClick={() => {
                      useDMLStore.getState().reviseDocument(record.id, { nt: revisionReason.trim() }, user?.name || 'System');
                      setShowRevisionPrompt(false);
                      setRevisionReason('');
                      onClose();
                    }}
                    className="px-3 py-1.5 text-sm text-accent-fg bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-4 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="dml" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="dml" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}
    </div>
  );
}

interface DMLFormData {
  no: string;
  tt: string;
  hierarchyLevel: 'L1' | 'L2' | 'L3' | 'L4';
  cl: string;
  rv: string;
  reviewDate: string;
  dept: string;
  ret: string;
  nt: string;
  assignedTo: string;
  dueDate: string;
}

function DMLFormModal({ record, onClose, onSubmit }: { record: DMLRecord | null; onClose: () => void; onSubmit: (data: DMLFormData) => void }) {
  const authUsers = useAuthStore((s) => s.users);
  const [formData, setFormData] = useState<DMLFormData>({
    no: record?.no || '', tt: record?.tt || '', hierarchyLevel: record?.hierarchyLevel || 'L4',
    cl: record?.cl || '', rv: record?.rv || 'Rev 00', reviewDate: record?.reviewDate || '',
    dept: record?.dept || '', ret: record?.ret || '', nt: record?.nt || '',
    assignedTo: record?.assignedTo || '', dueDate: record?.dueDate || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-2xl rounded-lg p-4 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold text-text-primary mb-5">{record ? 'Edit' : 'New'} Document</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Document No *">
              <input placeholder="e.g. DOC-001" className={inputCls} value={formData.no} onChange={e => setFormData({...formData, no: e.target.value})} required />
            </Labeled>
            <Labeled label="Title *">
              <input placeholder="e.g. Quality Manual" className={inputCls} value={formData.tt} onChange={e => setFormData({...formData, tt: e.target.value})} required />
            </Labeled>
            <Labeled label="Hierarchy Level *">
              <select className={inputCls} value={formData.hierarchyLevel} onChange={e => setFormData({...formData, hierarchyLevel: e.target.value as DMLFormData['hierarchyLevel']})} required>
                <option value="L1">L1 - Quality Manual</option>
                <option value="L2">L2 - Procedures</option>
                <option value="L3">L3 - Work Instructions</option>
                <option value="L4">L4 - Forms & Records</option>
              </select>
            </Labeled>
            <Labeled label="ISO Clause">
              <input placeholder="e.g. 7.5" className={inputCls} value={formData.cl} onChange={e => setFormData({...formData, cl: e.target.value})} />
            </Labeled>
            <Labeled label="Revision">
              <input placeholder="e.g. Rev 00" className={inputCls} value={formData.rv} onChange={e => setFormData({...formData, rv: e.target.value})} />
            </Labeled>
            <Labeled label="Review Date">
              <input type="date" className={inputCls} value={formData.reviewDate} onChange={e => setFormData({...formData, reviewDate: e.target.value})} />
            </Labeled>
            <Labeled label="Department">
              <DeptSelect value={formData.dept} onChange={(v) => setFormData({...formData, dept: v})} />
            </Labeled>
            <Labeled label="Retention Period">
              <input placeholder="e.g. 3 Years" className={inputCls} value={formData.ret} onChange={e => setFormData({...formData, ret: e.target.value})} />
            </Labeled>
            <Labeled label="Document Owner (Assigned To)">
              <select className={inputCls} value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                <option value="">— Select —</option>
                {authUsers.map((u) => (
                  <option key={u.id} value={u.displayName}>{u.displayName}</option>
                ))}
                {formData.assignedTo && !authUsers.some((u) => u.displayName === formData.assignedTo) && (
                  <option value={formData.assignedTo}>{formData.assignedTo}</option>
                )}
              </select>
            </Labeled>
            <Labeled label="Due Date">
              <input type="date" className={inputCls} value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </Labeled>
          </div>
          <Labeled label="Notes">
            <textarea
              placeholder="Additional remarks or change description..."
              className={inputCls}
              rows={3}
              value={formData.nt}
              onChange={e => setFormData({...formData, nt: e.target.value})}
            />
          </Labeled>

          <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-fg rounded-lg shadow-sm transition-colors">
              {record ? 'Save Changes' : 'Create Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
