import { useState, useMemo, type ReactNode } from 'react';
import { useNCRStore } from '../../store/useNCRStore';
import type { NCRRecordStatus, NCRRecord } from '../../store/useNCRStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { ActionPlanTable } from '../shared/ActionPlanTable';
import type { ActionPlanRow } from '../shared/ActionPlanTable';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';
import {
  Clock,
  CheckCircle,
  X,
  Paperclip,
  MessageSquare,
  Printer,
  Search,
  User as UserIcon,
  ArrowRight,
} from 'lucide-react';

const STATUSES: NCRRecordStatus[] = [
  'Open',
  'Investigation',
  'RootCause',
  'CAPA_Planned',
  'CAPA_InProgress',
  'Verification',
  'Closed'
];

const STATUS_LABELS: Record<NCRRecordStatus, string> = {
  Open: 'Open',
  'Under Investigation': 'Under Investigation',
  'Corrective Action Pending': 'Corrective Action Pending',
  Investigation: 'Investigation',
  RootCause: 'Root Cause Analysis',
  CAPA_Planned: 'CAPA Planned',
  CAPA_InProgress: 'CAPA In Progress',
  Verification: 'Verification',
  Closed: 'Closed'
};

const SLA_DAYS: Record<string, number> = {
  'NCR': 14,
  'Potential NCR': 2,
  'Observation': 30
};

const OBSERVATION_SUBTYPES = ['Potential for Weakness', 'Good Practice'];
const RCA_CATEGORIES = ['Human Error', 'Process Gap', 'Training', 'Management System Failure', 'Other'];

const inputCls = 'w-full border border-border bg-surface p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm';

function getNextStatus(current: NCRRecordStatus): NCRRecordStatus | null {
  const idx = STATUSES.indexOf(current);
  if (idx === -1 || idx === STATUSES.length - 1) return null;
  return STATUSES[idx + 1];
}

function getPrevStatus(current: NCRRecordStatus): NCRRecordStatus | null {
  const idx = STATUSES.indexOf(current);
  if (idx <= 0) return null;
  return STATUSES[idx - 1];
}

export function NCRWorkflow() {
  const records = useNCRStore((state) => state.records);

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | NCRRecordStatus>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'sla' | 'ref'>('newest');

  const selectedRecord = records.find((r) => r.id === selectedRecordId) || null;

  const assigneeOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.assignedTo).filter(Boolean))) as string[],
    [records]
  );

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (deptFilter !== 'All') {
      list = list.filter((r) => r.assignedDept === deptFilter || r.auditeeDept === deptFilter);
    }
    if (assigneeFilter !== 'All') {
      list = list.filter((r) => r.assignedTo === assigneeFilter);
    }
    if (overdueOnly) {
      list = list.filter((r) => {
        const sla = calculateSLA(r);
        return !!sla && sla.daysLeft < 0;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.ref || '').toLowerCase().includes(q) ||
          (r.desc || '').toLowerCase().includes(q) ||
          (r.project || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'ref') return (a.ref || '').localeCompare(b.ref || '');
      if (sortBy === 'sla') {
        const sa = calculateSLA(a)?.daysLeft ?? Infinity;
        const sb = calculateSLA(b)?.daysLeft ?? Infinity;
        return sa - sb;
      }
      return 0;
    });
  }, [records, showArchived, deptFilter, assigneeFilter, overdueOnly, search, sortBy]);

  const visibleStatuses = statusFilter === 'All' ? STATUSES : [statusFilter];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col p-2">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-text-primary">NCR Workflow Board</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
            Show Archived
          </label>
          <button onClick={() => setShowForm(true)} className="bg-accent text-accent-fg px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-2">
            + New NCR
          </button>
        </div>
      </div>

      {/* Filters / Search / Sort */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, description, project…"
            className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-64"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | NCRRecordStatus)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Departments</option>
          {PTA_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Assignees</option>
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
          Overdue only
        </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="sla">SLA soonest</option>
          <option value="ref">Reference A–Z</option>
        </select>
      </div>

      {/* Kanban Board */}
      {/* `items-start` is doing real work: the columns are flex children of a
          full-height row, so without it an empty stage stretched to ~700px of
          blank board. They now size to their cards and only start scrolling
          when they reach the bottom of the viewport. */}
      <div className="flex flex-1 items-start gap-3 overflow-x-auto pb-4">
        {visibleStatuses.map((status) => {
          const cards = filteredRecords.filter((r) => r.status === status);
          return (
            <div key={status} className="flex max-h-full min-w-[300px] max-w-[300px] flex-col rounded-lg border border-border bg-surface-secondary">
              <div className="flex shrink-0 items-center justify-between gap-2 rounded-t-lg border-b border-border bg-surface/50 px-3 py-2">
                <span className="truncate text-sm font-semibold text-text-primary">{STATUS_LABELS[status]}</span>
                <span className="shrink-0 rounded-full border border-border bg-surface-hover px-1.5 text-[11px] font-semibold tabular-nums text-text-secondary">
                  {cards.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-2 py-3 text-center text-xs text-text-tertiary">
                    Nothing at this stage
                  </p>
                ) : (
                  cards.map((record) => (
                    <NCRCard key={record.id} record={record} onClick={() => setSelectedRecordId(record.id)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedRecord && <NCRDetailModal record={selectedRecord} onClose={() => setSelectedRecordId(null)} />}

      {showForm && (
        <NCRFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            useNCRStore.getState().addRecord({ ...data, status: 'Open' } as Omit<NCRRecord, 'id' | 'createdAt' | 'updatedAt'>);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function NCRCard({ record, onClick }: { record: NCRRecord; onClick: () => void }) {
  const slaInfo = calculateSLA(record);

  return (
    <div
      onClick={onClick}
      className="bg-surface p-4 rounded-lg shadow-sm border border-border cursor-pointer hover:border-accent hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">{record.ref || 'Draft'}</span>
        {slaInfo && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${slaInfo.colorClass}`}>
            <Clock className="w-3 h-3" />
            {slaInfo.daysLeft > 0 ? `${slaInfo.daysLeft}d left` : 'Overdue'}
          </span>
        )}
      </div>
      <p className="text-sm line-clamp-2 text-text-secondary mb-3">{record.desc || 'No description'}</p>
      <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
        <span className="bg-surface-hover px-2 py-1 rounded-md border border-border">{record.classification || 'Unclassified'}</span>
        <span className="truncate max-w-[120px]">{record.project}</span>
      </div>
      {(record.assignedTo || record.assignedDept) && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap mt-2 pt-2 border-t border-border">
          {record.assignedTo && (
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {record.assignedTo}</span>
          )}
          {record.assignedDept && <span className="bg-surface-hover px-1.5 py-0.5 rounded border border-border">{record.assignedDept}</span>}
        </div>
      )}
    </div>
  );
}

function calculateSLA(record: NCRRecord) {
  if (record.status === 'Closed') return null;

  let deadlineDate: Date;
  if (record.slaDeadline) {
    deadlineDate = new Date(record.slaDeadline);
  } else if (record.createdAt) {
    const classification = record.classification || 'NCR';
    const totalDays = SLA_DAYS[classification] || 14;
    deadlineDate = new Date(new Date(record.createdAt).getTime() + totalDays * 24 * 60 * 60 * 1000);
  } else {
    return null;
  }

  const now = new Date();
  const msLeft = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  let colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50';
  if (daysLeft < 0) {
    colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50';
  } else if (daysLeft <= 3) {
    colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50';
  }

  return { daysLeft, colorClass, deadlineDate };
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</h4>
      <p className="text-sm text-text-primary whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}

function NCRDetailModal({ record, onClose }: { record: NCRRecord; onClose: () => void }) {
  const { user } = useAuth();

  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';
  const isSpoc = user?.role === 'department_spoc' || isMR;

  const [showEdit, setShowEdit] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');

  const [rcaData, setRcaData] = useState(() => (record.rca || '').split('\n\n5-Whys:\n')[0]);
  const [fiveWhys, setFiveWhys] = useState<string[]>(() => {
    const parts = (record.rca || '').split('\n\n5-Whys:\n');
    const whys = ['', '', '', '', ''];
    if (parts[1]) {
      const lines = parts[1].split('\n');
      lines.forEach((line) => {
        const match = line.match(/^Why (\d+): (.*)$/);
        if (match) {
          const idx = parseInt(match[1], 10) - 1;
          if (idx >= 0 && idx < 5) whys[idx] = match[2];
        }
      });
    }
    return whys;
  });

  const handle5WhyChange = (index: number, val: string) => {
    const newWhys = [...fiveWhys];
    newWhys[index] = val;
    setFiveWhys(newWhys);
  };

  const handleSaveRCA = () => {
    const combined = fiveWhys.filter((w) => w.trim() !== '').map((w, i) => `Why ${i + 1}: ${w}`).join('\n');
    useNCRStore.getState().updateRecord(record.id, { rca: rcaData + (combined ? '\n\n5-Whys:\n' + combined : '') });
  };

  const projectId = record.project || record.id;

  const actionPlanRows: ActionPlanRow[] = [
    { key: 'containment', label: 'Containment / Correction', description: record.containmentAction, owner: record.containmentBy, targetDate: record.containmentTargetDate, completionDate: record.containmentDate },
    { key: 'corrective', label: 'Corrective Action', description: record.corrAction, owner: record.corrBy, targetDate: record.corrTargetDate, completionDate: record.corrCompletionDate },
    { key: 'preventive', label: 'Preventive Action', description: record.prevAction, owner: record.prevBy, targetDate: record.prevTargetDate, completionDate: record.prevCompletionDate },
  ];

  const handleActionPlanChange = (key: ActionPlanRow['key'], field: 'description' | 'owner' | 'targetDate' | 'completionDate', value: string) => {
    const patch: Partial<NCRRecord> = {};
    if (key === 'containment') {
      if (field === 'description') patch.containmentAction = value;
      else if (field === 'owner') patch.containmentBy = value;
      else if (field === 'targetDate') patch.containmentTargetDate = value;
      else patch.containmentDate = value;
    } else if (key === 'corrective') {
      if (field === 'description') patch.corrAction = value;
      else if (field === 'owner') patch.corrBy = value;
      else if (field === 'targetDate') patch.corrTargetDate = value;
      else patch.corrCompletionDate = value;
    } else {
      if (field === 'description') patch.prevAction = value;
      else if (field === 'owner') patch.prevBy = value;
      else if (field === 'targetDate') patch.prevTargetDate = value;
      else patch.prevCompletionDate = value;
    }
    useNCRStore.getState().updateRecord(record.id, patch);
  };

  const sla = calculateSLA(record);
  const isOverdue = !!sla && sla.daysLeft < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:static print:bg-transparent print:p-0">
      <div className="bg-surface w-full max-w-6xl h-[90vh] rounded-lg flex flex-col shadow-2xl border border-border print:h-auto print:max-w-full print:shadow-none print:border-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-secondary/50 rounded-t-2xl print:hidden">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-text-primary">{record.ref || 'Draft NCR'}</h2>
              <StatusBadge status={STATUS_LABELS[record.status]} />
              {isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-text-tertiary flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Created {new Date(record.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="font-medium text-text-secondary">{record.classification}</span>
              <span>•</span>
              <span className="font-medium text-text-secondary">{record.project}</span>
              {record.assignedTo && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><UserIcon className="w-4 h-4" /> {record.assignedTo}{record.assignedDept ? ` (${record.assignedDept})` : ''}</span>
                </>
              )}
              {record.slaDeadline && (
                <>
                  <span>•</span>
                  <span>Due {record.slaDeadline}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors mr-1">
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
            <button
              onClick={() => {
                if (window.confirm('Delete this NCR?')) {
                  useNCRStore.getState().deleteRecord(record.id);
                  onClose();
                }
              }}
              className="p-2 text-danger-text hover:bg-danger-subtle rounded-full transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => {
                useNCRStore.getState().updateRecord(record.id, { isArchived: !record.isArchived });
                onClose();
              }}
              className="p-2 text-warning-text hover:bg-amber-50 rounded-full transition-colors"
            >
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 print:overflow-visible">
            {/* General info (closes orphan fields) */}
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Raised By" value={record.raisedBy} />
              <InfoField label="Auditee Name" value={record.auditeeName} />
              <InfoField label="Auditee Dept" value={record.auditeeDept} />
              <InfoField label="Auditee Email" value={record.auditeeEmail} />
              <InfoField label="Reference Document / ISO Clause" value={record.refDoc} />
              {record.classification === 'Observation' ? (
                <InfoField label="Observation Sub-Type" value={record.obSubType} />
              ) : (
                <InfoField label="Root Cause Category" value={record.rcaCat} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              <section>
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Description</h3>
                <div className="bg-surface-secondary p-4 rounded-xl border border-border min-h-[100px]">
                  <p className="text-text-primary whitespace-pre-wrap">{record.desc}</p>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Objective Evidence</h3>
                <div className="bg-surface-secondary p-4 rounded-xl border border-border min-h-[100px]">
                  <p className="text-text-primary whitespace-pre-wrap">{record.objEvidence}</p>
                </div>
              </section>
            </div>

            {record.status === 'RootCause' && (
              <section className="bg-accent-subtle/30 p-4 rounded-xl border border-accent/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Root Cause Analysis (5-Whys)</h3>
                  {isSpoc ? (
                    <span className="text-xs font-semibold px-2 py-1 bg-accent text-accent-fg rounded-md">SPOC Access</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-1 bg-danger-subtle text-danger-text rounded-md">View Only</span>
                  )}
                </div>

                <div className="space-y-4">
                  {fiveWhys.map((why, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <span className="font-bold text-accent min-w-[60px] pt-2">Why {idx + 1}?</span>
                      <textarea
                        className="flex-1 bg-surface border border-border rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all disabled:opacity-50"
                        rows={2}
                        value={why}
                        disabled={!isSpoc}
                        onChange={(e) => handle5WhyChange(idx, e.target.value)}
                        placeholder="Enter explanation..."
                      />
                    </div>
                  ))}

                  <div className="pt-4">
                    <label className="font-bold text-text-primary mb-2 block">Additional RCA Notes</label>
                    <textarea
                      className="w-full bg-surface border border-border rounded-lg p-3 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all disabled:opacity-50"
                      rows={3}
                      value={rcaData}
                      disabled={!isSpoc}
                      onChange={(e) => setRcaData(e.target.value)}
                      placeholder="Other context or contributing factors..."
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    {isSpoc ? (
                      <button
                        onClick={handleSaveRCA}
                        className="bg-accent text-accent-fg px-4 py-2.5 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-2"
                      >
                        Save Root Cause Notes <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <p className="text-sm text-danger-text font-medium bg-danger-subtle p-3 rounded-lg border border-border">
                        You do not have permission to submit Root Cause. This requires SPOC or QA Manager role.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">Use the Workflow State panel below to advance to CAPA Planning, or return this NCR to Investigation.</p>
                </div>
              </section>
            )}

            {/* Action Plan */}
            <section>
              <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Action Plan</h3>
              <ActionPlanTable rows={actionPlanRows} editable={isSpoc} entityId={record.id} projectId={projectId} onChange={handleActionPlanChange} />
            </section>

            {record.status === 'Verification' && (
              <section className="bg-surface-secondary p-4 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-text-primary mb-4">Verification & Closure</h3>
                {isMR ? (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={verificationReason}
                      onChange={(e) => setVerificationReason(e.target.value)}
                      placeholder="Verification comments / reason (required)"
                      className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex gap-4">
                      <button
                        disabled={!verificationReason.trim()}
                        onClick={() => {
                          useNCRStore.getState().approveNCR(record.id, user?.name || 'System', verificationReason.trim());
                          setVerificationReason('');
                        }}
                        className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" /> Approve & Close NCR
                      </button>
                      <button
                        disabled={!verificationReason.trim()}
                        onClick={() => {
                          useNCRStore.getState().rejectNCR(record.id, user?.name || 'System', verificationReason.trim());
                          setVerificationReason('');
                        }}
                        className="bg-surface text-text-primary border border-border px-4 py-2.5 rounded-lg font-semibold hover:bg-surface-hover disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <X className="w-5 h-5" /> Reject (Return to CAPA)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-danger-subtle border border-border p-4 rounded-lg">
                    <p className="text-sm text-danger-text font-medium">Only Management Representative (Admin / QA Manager) can verify and close this NCR.</p>
                  </div>
                )}
              </section>
            )}

            {(record.finalDecision || record.verifiedBy) && (
              <div className="grid grid-cols-3 gap-4">
                <InfoField label="Final Decision" value={record.finalDecision} />
                <InfoField label="Verified By" value={record.verifiedBy} />
                <InfoField label="Verified Date" value={record.verifiedDate} />
              </div>
            )}

            {/* Workflow state machine: forward / reject / reopen */}
            <section className="pt-6 border-t border-border border-dashed">
              <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Workflow State</h3>
              <StateTransitionBar
                statuses={STATUSES}
                statusLabels={STATUS_LABELS}
                current={record.status}
                history={record.stateHistory}
                canAdvance={isMR && record.status !== 'Verification'}
                canVerifyClose={isMR}
                canReopen={isMR}
                onForward={(reason) => {
                  const next = getNextStatus(record.status);
                  if (next) useNCRStore.getState().transitionStatus(record.id, next, user?.name || 'System', reason, 'forward');
                }}
                onReject={(reason) => {
                  const prev = getPrevStatus(record.status);
                  if (prev) useNCRStore.getState().transitionStatus(record.id, prev, user?.name || 'System', reason, 'reject');
                }}
                onReopen={(reason) => useNCRStore.getState().transitionStatus(record.id, 'CAPA_InProgress', user?.name || 'System', reason, 'reopen')}
              />
              {!isMR && record.status !== 'Verification' && (
                <p className="text-xs text-text-tertiary mt-2">Only Management Representative (Admin / QA Manager) can change this NCR's workflow stage.</p>
              )}
            </section>

            {showComments && (
              <section className="pt-6 border-t border-border print:hidden">
                <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
                <CommentThread entityType="ncr" entityId={record.id} projectId={projectId} />
              </section>
            )}
          </div>
        </div>
      </div>

      {showEvidence && (
        <EvidencePanel entityType="ncr" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}

      {showEdit && (
        <NCRFormModal
          initial={record}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => {
            useNCRStore.getState().updateRecord(record.id, data);
            setShowEdit(false);
          }}
        />
      )}
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

interface NCRFormData {
  ref: string;
  project: string;
  raisedBy: string;
  auditeeName: string;
  auditeeDept: string;
  refDoc: string;
  auditeeEmail: string;
  classification: 'NCR' | 'Potential NCR' | 'Observation';
  obSubType: string;
  desc: string;
  objEvidence: string;
  rcaCat: string;
  rca: string;
  corrAction: string;
  corrBy: string;
  prevAction: string;
  prevBy: string;
  assignedTo: string;
  assignedDept: string;
  slaDeadline: string;
}

function NCRFormModal({
  onClose,
  onSubmit,
  initial,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<NCRRecord>) => void;
  initial?: NCRRecord;
}) {
  const authUsers = useAuthStore((s) => s.users);

  const [formData, setFormData] = useState<NCRFormData>({
    ref: initial?.ref ?? '',
    project: initial?.project ?? '',
    raisedBy: initial?.raisedBy ?? '',
    auditeeName: initial?.auditeeName ?? '',
    auditeeDept: initial?.auditeeDept ?? '',
    refDoc: initial?.refDoc ?? '',
    auditeeEmail: initial?.auditeeEmail ?? '',
    classification: (initial?.classification as NCRFormData['classification']) ?? 'NCR',
    obSubType: initial?.obSubType ?? '',
    desc: initial?.desc ?? '',
    objEvidence: initial?.objEvidence ?? '',
    rcaCat: initial?.rcaCat ?? '',
    rca: initial?.rca ?? '',
    corrAction: initial?.corrAction ?? '',
    corrBy: initial?.corrBy ?? '',
    prevAction: initial?.prevAction ?? '',
    prevBy: initial?.prevBy ?? '',
    assignedTo: initial?.assignedTo ?? '',
    assignedDept: initial?.assignedDept ?? '',
    slaDeadline: initial?.slaDeadline ?? '',
  });

  const showCauseSections = formData.classification !== 'Observation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-3xl rounded-xl p-4 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold mb-4">{initial ? 'Edit NCR' : 'Create New NCR'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Classification</legend>
            <div className="flex gap-4 flex-wrap">
              {(['Observation', 'Potential NCR', 'NCR'] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="classification" checked={formData.classification === opt} onChange={() => setFormData({ ...formData, classification: opt })} />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-4">
            <Labeled label="Report No.">
              <input className={inputCls} value={formData.ref} onChange={(e) => setFormData({ ...formData, ref: e.target.value })} required />
            </Labeled>
            <Labeled label="Project / Client / Site">
              <input className={inputCls} value={formData.project} onChange={(e) => setFormData({ ...formData, project: e.target.value })} required />
            </Labeled>
            <Labeled label="Raised By">
              <input className={inputCls} value={formData.raisedBy} onChange={(e) => setFormData({ ...formData, raisedBy: e.target.value })} required />
            </Labeled>
            <Labeled label="Auditee Name">
              <input className={inputCls} value={formData.auditeeName} onChange={(e) => setFormData({ ...formData, auditeeName: e.target.value })} required />
            </Labeled>
            <Labeled label="Auditee Dept">
              <DeptSelect value={formData.auditeeDept} onChange={(v) => setFormData({ ...formData, auditeeDept: v })} />
            </Labeled>
            <Labeled label="Ref Document / ISO Clause">
              <input className={inputCls} value={formData.refDoc} onChange={(e) => setFormData({ ...formData, refDoc: e.target.value })} />
            </Labeled>
            <Labeled label="Auditee Email">
              <input type="email" className={inputCls} value={formData.auditeeEmail} onChange={(e) => setFormData({ ...formData, auditeeEmail: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-3 gap-4">
            <Labeled label="Assigned To (Action Owner)">
              <select className={inputCls} value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}>
                <option value="">— Select —</option>
                {authUsers.map((u) => (
                  <option key={u.id} value={u.displayName}>{u.displayName}</option>
                ))}
                {formData.assignedTo && !authUsers.some((u) => u.displayName === formData.assignedTo) && (
                  <option value={formData.assignedTo}>{formData.assignedTo}</option>
                )}
              </select>
            </Labeled>
            <Labeled label="Assigned Department">
              <DeptSelect value={formData.assignedDept} onChange={(v) => setFormData({ ...formData, assignedDept: v })} />
            </Labeled>
            <Labeled label="Due Date (SLA Deadline)">
              <input type="date" className={inputCls} value={formData.slaDeadline} onChange={(e) => setFormData({ ...formData, slaDeadline: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset className="space-y-3">
            {formData.classification === 'Observation' && (
              <div>
                <legend className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Observation Sub-Type</legend>
                <div className="flex gap-4">
                  {OBSERVATION_SUBTYPES.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="obSubType" checked={formData.obSubType === opt} onChange={() => setFormData({ ...formData, obSubType: opt })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Labeled label="Description of Finding">
              <textarea className={inputCls} rows={3} value={formData.desc} onChange={(e) => setFormData({ ...formData, desc: e.target.value })} required />
            </Labeled>
            <Labeled label="Objective Evidence">
              <textarea className={inputCls} rows={2} value={formData.objEvidence} onChange={(e) => setFormData({ ...formData, objEvidence: e.target.value })} required />
            </Labeled>
          </fieldset>

          {showCauseSections && (
            <fieldset className="space-y-3">
              <div>
                <legend className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Root Cause Category</legend>
                <div className="flex gap-4 flex-wrap">
                  {RCA_CATEGORIES.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="rcaCat" checked={formData.rcaCat === opt} onChange={() => setFormData({ ...formData, rcaCat: opt })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <Labeled label="Root Cause Analysis">
                <textarea className={inputCls} rows={2} value={formData.rca} onChange={(e) => setFormData({ ...formData, rca: e.target.value })} />
              </Labeled>
            </fieldset>
          )}

          {showCauseSections && (
            <fieldset className="grid grid-cols-2 gap-4">
              <Labeled label="Corrective Action Description">
                <textarea className={inputCls} rows={2} value={formData.corrAction} onChange={(e) => setFormData({ ...formData, corrAction: e.target.value })} />
              </Labeled>
              <Labeled label="Corrective Action Completed By">
                <input className={inputCls} value={formData.corrBy} onChange={(e) => setFormData({ ...formData, corrBy: e.target.value })} />
              </Labeled>
              <Labeled label="Preventive Action Description">
                <textarea className={inputCls} rows={2} value={formData.prevAction} onChange={(e) => setFormData({ ...formData, prevAction: e.target.value })} />
              </Labeled>
              <Labeled label="Preventive Action Completed By">
                <input className={inputCls} value={formData.prevBy} onChange={(e) => setFormData({ ...formData, prevBy: e.target.value })} />
              </Labeled>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-surface-hover">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover">{initial ? 'Save Changes' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
