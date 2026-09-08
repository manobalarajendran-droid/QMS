import { useState, useMemo, type ReactNode } from 'react';
import { useMRMStore } from '../../store/useMRMStore';
import type { MRMActionItem, MRMRecord, MRMStatus } from '../../store/useMRMStore';
import { useNCRStore } from '../../store/useNCRStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { useClientIntakeStore } from '../../store/useClientIntakeStore';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useSupplierEvalStore } from '../../store/useSupplierEvalStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Landmark, Plus, ChevronDown, ChevronRight, Paperclip, MessageSquare, Printer, X,
  AlertTriangle, CheckCircle2, Clock, Users, FileText, ClipboardList, Flag, Search, ListChecks,
} from 'lucide-react';

import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';

const INPUT_LABELS: Record<string, string> = {
  customerFeedback: 'Customer Feedback (Cl.9.1.2)',
  objectivesReview: 'Quality Objectives Review (Cl.6.2)',
  processPerformance: 'Process Performance & Product Conformity',
  ncrsAndCAPAs: 'NCRs & CAPAs (Cl.10.2)',
  auditFindings: 'Internal & External Audit Findings',
  supplierPerformance: 'Supplier Performance',
  resourceAdequacy: 'Resource Adequacy',
  riskOpportunities: 'Risk & Opportunities (Cl.6.1)',
};

// ── State machine: canonical 3-stage bar. Older/seed records may carry one of the
// 4 legacy MRMStatus values (Scheduled/In Progress/Completed/Cancelled) — normalize
// those onto the canonical bar for display/navigation without rewriting stored data.
const STATUSES: MRMStatus[] = ['Draft', 'Reviewed', 'Approved'];

const STATUS_LABELS: Record<MRMStatus, string> = {
  Draft: 'Draft',
  Reviewed: 'Reviewed',
  Approved: 'Approved',
  Scheduled: 'Draft',
  'In Progress': 'Draft',
  Completed: 'Approved',
  Cancelled: 'Draft',
};

const LEGACY_STATUS_MAP: Partial<Record<MRMStatus, MRMStatus>> = {
  Scheduled: 'Draft',
  'In Progress': 'Draft',
  Completed: 'Approved',
  Cancelled: 'Draft',
};

function normalizeStatus(status: MRMStatus): MRMStatus {
  return LEGACY_STATUS_MAP[status] ?? status;
}

function isOverdueMRM(record: MRMRecord): boolean {
  if (normalizeStatus(record.status) === 'Approved') return false;
  if (!record.meetingDate) return false;
  return new Date(record.meetingDate) < new Date(new Date().toDateString());
}

function isActionOverdue(item: MRMActionItem): boolean {
  if (item.status === 'Closed' || !item.dueDate) return false;
  return new Date(item.dueDate) < new Date(new Date().toDateString());
}

function generatePreReadPack(
  objectives: ReturnType<typeof useObjectivesStore.getState>['records'],
  intakeRecords: ReturnType<typeof useClientIntakeStore.getState>['records']
): { objectiveMisses: string[]; slaBreaches: string[] } {
  const objectiveMisses: string[] = [];
  const slaBreaches: string[] = [];

  objectives.forEach((o) => {
    if (o.status === 'Not Started' && o.deadline && new Date(o.deadline) < new Date()) {
      objectiveMisses.push(`${o.dept} — ${o.desc || o.objId} (Deadline: ${o.deadline})`);
    }
  });

  intakeRecords.forEach((r) => {
    if (r.status === 'Logged' && !r.timeAcknowledged) {
      const logged = new Date(r.timeLogged);
      const hoursOpen = (Date.now() - logged.getTime()) / 3600000;
      if (hoursOpen > 4 && r.intakeType === 'Emergency') {
        slaBreaches.push(`EMERGENCY — "${r.title}" (Received: ${logged.toLocaleString()}, unacknowledged for ${Math.floor(hoursOpen)}h)`);
      } else if (hoursOpen > 72 && r.intakeType === 'Complaint') {
        slaBreaches.push(`COMPLAINT — "${r.title}" (Unresolved for ${Math.floor(hoursOpen / 24)} days)`);
      }
    }
  });

  return { objectiveMisses, slaBreaches };
}

const inputCls = 'w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary text-sm transition-colors';

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</span>
      {children}
    </label>
  );
}

function ChairpersonSelect({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const authUsers = useAuthStore((s) => s.users);
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">— Select —</option>
      {authUsers.map((u) => (
        <option key={u.id} value={u.displayName}>{u.displayName}</option>
      ))}
      {value && !authUsers.some((u) => u.displayName === value) && <option value={value}>{value}</option>}
    </select>
  );
}

export function MRMManager() {
  const records = useMRMStore((s) => s.records);
  const addRecord = useMRMStore((s) => s.addRecord);
  const ncrRecords = useNCRStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const intakeRecords = useClientIntakeStore((s) => s.records);

  const [view, setView] = useState<'meetings' | 'actions'>('meetings');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | MRMStatus>('All');
  const [chairpersonFilter, setChairpersonFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'date' | 'meetingNo'>('newest');

  const chairpersonOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.chairperson).filter(Boolean))),
    [records]
  );

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter !== 'All') {
      list = list.filter((r) => normalizeStatus(r.status) === normalizeStatus(statusFilter));
    }
    if (chairpersonFilter !== 'All') {
      list = list.filter((r) => r.chairperson === chairpersonFilter);
    }
    if (overdueOnly) {
      list = list.filter(isOverdueMRM);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.meetingNo.toLowerCase().includes(q) ||
          r.venue.toLowerCase().includes(q) ||
          r.chairperson.toLowerCase().includes(q) ||
          r.minutesSummary.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'meetingNo') return a.meetingNo.localeCompare(b.meetingNo);
      if (sortBy === 'date') return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
      return 0;
    });
  }, [records, showArchived, statusFilter, chairpersonFilter, overdueOnly, search, sortBy]);

  const selected = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId]);

  const openNCRCount = ncrRecords.filter((r) => r.status !== 'Closed').length;
  const openActionsCount = records.flatMap((r) => r.actionItems).filter((a) => a.status !== 'Closed').length;

  const preRead = useMemo(() => generatePreReadPack(objectives, intakeRecords), [objectives, intakeRecords]);

  const handleCreateMeeting = (formData: {
    meetingNo: string;
    meetingDate: string;
    chairperson: string;
    attendees: string[];
    venue: string;
    agendaItems: string[];
    minutesRef: string;
  }) => {
    const { objectiveMisses, slaBreaches } = generatePreReadPack(objectives, intakeRecords);
    addRecord({
      meetingDate: formData.meetingDate,
      meetingNo: formData.meetingNo,
      chairperson: formData.chairperson,
      attendees: formData.attendees,
      venue: formData.venue,
      status: 'Draft',
      agendaItems: formData.agendaItems,
      inputs: {
        customerFeedback: false, objectivesReview: false, processPerformance: false,
        ncrsAndCAPAs: false, auditFindings: false, supplierPerformance: false,
        resourceAdequacy: false, riskOpportunities: false,
      },
      minutesSummary: '',
      decisions: '',
      minutesRef: formData.minutesRef,
      actionItems: [],
      flaggedObjectiveMisses: objectiveMisses,
      flaggedSLABreaches: slaBreaches,
    });
    setShowNewModal(false);
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('meetings')}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${view === 'meetings' ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:bg-surface-hover'}`}
        >
          <Landmark className="w-4 h-4" /> Meetings
        </button>
        <button
          onClick={() => setView('actions')}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${view === 'actions' ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:bg-surface-hover'}`}
        >
          <ListChecks className="w-4 h-4" /> Action Tracker
        </button>
      </div>

      {view === 'actions' ? (
        <ActionTrackerView records={records} />
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* Left panel */}
          <div className="w-96 shrink-0 flex flex-col gap-3">
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-bold text-accent">{openNCRCount}</div>
                <div className="text-xs text-text-tertiary">Open NCRs</div>
              </div>
              <div className="bg-surface rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-bold text-accent">{openActionsCount}</div>
                <div className="text-xs text-text-tertiary">Open Actions</div>
              </div>
            </div>

            {/* Pre-read alerts */}
            {(preRead.objectiveMisses.length > 0 || preRead.slaBreaches.length > 0) && (
              <div className="bg-danger-subtle border border-danger/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-danger mb-2 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Auto-flagged for next MRM
                </div>
                {preRead.objectiveMisses.map((m, i) => (
                  <div key={i} className="text-xs text-danger mb-1">⚠ {m}</div>
                ))}
                {preRead.slaBreaches.map((b, i) => (
                  <div key={i} className="text-xs text-danger mb-1">🚨 {b}</div>
                ))}
              </div>
            )}

            {/* Header + new button */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                MRM Meetings
              </h2>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1 text-xs bg-accent text-white px-2 py-1 rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            {/* Search + filters */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meeting no., venue, chairperson…"
                className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | MRMStatus)} className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5">
                <option value="All">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <select value={chairpersonFilter} onChange={(e) => setChairpersonFilter(e.target.value)} className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5">
                <option value="All">All Chairpersons</option>
                {chairpersonOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="date">Meeting date</option>
                <option value="meetingNo">Meeting No. A–Z</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
                Overdue only
              </label>
              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
                Show Archived
              </label>
            </div>

            {/* Meeting list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredRecords.map((r) => {
                const overdue = isOverdueMRM(r);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === r.id
                        ? 'border-accent bg-accent-subtle'
                        : 'border-border bg-surface hover:bg-surface-hover'
                    } ${r.isArchived ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{r.meetingNo}</div>
                        <div className="text-xs text-text-tertiary mt-0.5">{r.meetingDate} · {r.chairperson}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
                        <StatusBadge status={STATUS_LABELS[r.status] ?? r.status} />
                      </div>
                    </div>
                    {(r.flaggedObjectiveMisses.length > 0 || r.flaggedSLABreaches.length > 0) && (
                      <div className="mt-1.5 text-xs text-danger flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {r.flaggedObjectiveMisses.length + r.flaggedSLABreaches.length} flagged items
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredRecords.length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-8">No meetings found.</p>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                Select a meeting to view details
              </div>
            ) : (
              <MRMDetailPanel record={selected} onClose={() => setSelectedId(null)} />
            )}
          </div>

          {showNewModal && (
            <MRMFormModal
              suggestedNo={`MRM-${new Date().getFullYear()}-${String(records.length + 1).padStart(2, '0')}`}
              onClose={() => setShowNewModal(false)}
              onSubmit={handleCreateMeeting}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionTrackerView({ records }: { records: MRMRecord[] }) {
  const updateActionItem = useMRMStore((s) => s.updateActionItem);
  const [statusFilter, setStatusFilter] = useState<'All' | MRMActionItem['status']>('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const flat = useMemo(
    () => records.flatMap((r) => r.actionItems.map((a) => ({ ...a, meetingNo: r.meetingNo, meetingId: r.id }))),
    [records]
  );

  const ownerOptions = useMemo(() => Array.from(new Set(flat.map((a) => a.owner).filter(Boolean))), [flat]);

  const filtered = useMemo(() => {
    let list = flat;
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter);
    if (ownerFilter !== 'All') list = list.filter((a) => a.owner === ownerFilter);
    if (overdueOnly) list = list.filter(isActionOverdue);
    return list;
  }, [flat, statusFilter, ownerFilter, overdueOnly]);

  return (
    <div className="flex-1 overflow-y-auto bg-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-xs bg-surface-secondary border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="text-xs bg-surface-secondary border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Owners</option>
          {ownerOptions.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
          Overdue only
        </label>
      </div>
      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface-secondary">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">{a.description}</div>
              <div className="flex items-center gap-3 text-xs text-text-tertiary mt-0.5">
                <span>{a.meetingNo}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a.owner || '—'}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.dueDate || '—'}</span>
                {isActionOverdue(a) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
              </div>
            </div>
            <select
              value={a.status}
              onChange={(e) =>
                updateActionItem(a.meetingId, a.id, {
                  status: e.target.value as MRMActionItem['status'],
                  closedAt: e.target.value === 'Closed' ? new Date().toISOString() : undefined,
                })
              }
              className="text-xs border border-border rounded px-1.5 py-1 bg-surface text-text-secondary"
            >
              <option>Open</option>
              <option>In Progress</option>
              <option>Closed</option>
            </select>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-text-tertiary text-center py-8">No action items found.</p>}
      </div>
    </div>
  );
}

function MRMDetailPanel({ record, onClose }: { record: MRMRecord; onClose: () => void }) {
  const { user } = useAuth();
  const updateRecord = useMRMStore((s) => s.updateRecord);
  const transitionStatus = useMRMStore((s) => s.transitionStatus);
  const toggleArchive = useMRMStore((s) => s.toggleArchive);
  const deleteRecord = useMRMStore((s) => s.deleteRecord);
  const addActionItem = useMRMStore((s) => s.addActionItem);
  const updateActionItem = useMRMStore((s) => s.updateActionItem);
  const deleteActionItem = useMRMStore((s) => s.deleteActionItem);

  const ncrRecords = useNCRStore((s) => s.records);
  const auditRecords = useAuditProgrammeStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const csiRecords = useCSIStore((s) => s.records);
  const supplierRecords = useSupplierEvalStore((s) => s.records);

  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ inputs: true, minutes: true });
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  const toggleSection = (id: string) => setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const projectId = record.meetingNo || record.id;
  const overdue = isOverdueMRM(record);
  const normalized = normalizeStatus(record.status);

  const openNCRs = ncrRecords.filter((r) => r.status !== 'Closed').length;
  const openAudits = auditRecords.filter((r) => !['Completed', 'Follow-up', 'Report Issued'].includes(r.status)).length;
  const pendingObjectives = objectives.filter((o) => o.status !== 'Achieved').length;
  const pendingSuppliers = supplierRecords.filter((s) => s.status === 'Under Evaluation').length;

  const inputSignals: Partial<Record<keyof MRMRecord['inputs'], string>> = {
    ncrsAndCAPAs: `${openNCRs} open NCR${openNCRs === 1 ? '' : 's'}`,
    auditFindings: `${openAudits} open audit${openAudits === 1 ? '' : 's'}`,
    objectivesReview: `${pendingObjectives} objective${pendingObjectives === 1 ? '' : 's'} not yet achieved`,
    customerFeedback: `${csiRecords.length} CSI survey${csiRecords.length === 1 ? '' : 's'} on file`,
    supplierPerformance: `${pendingSuppliers} supplier${pendingSuppliers === 1 ? '' : 's'} under evaluation`,
  };

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-text-primary">{record.meetingNo}</h2>
              <StatusBadge status={STATUS_LABELS[record.status] ?? record.status} />
              {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
            </div>
            {!editingDetails ? (
              <>
                <p className="text-sm text-text-tertiary mt-1">{record.meetingDate} · {record.venue}</p>
                <p className="text-sm text-text-secondary mt-1">
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Chair: {record.chairperson || '—'} · Attendees: {record.attendees.join(', ') || 'None listed'}
                </p>
              </>
            ) : (
              <MRMDetailsEditForm
                record={record}
                onCancel={() => setEditingDetails(false)}
                onSave={(data) => { updateRecord(record.id, data); setEditingDetails(false); }}
              />
            )}
          </div>
          <div className="flex items-center gap-1 print:hidden shrink-0">
            {!editingDetails && (
              <button onClick={() => setEditingDetails(true)} className="px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors mr-1">
                Edit
              </button>
            )}
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
                if (window.confirm('Delete this MRM record?')) {
                  deleteRecord(record.id);
                  onClose();
                }
              }}
              className="p-2 text-danger hover:bg-danger-subtle rounded-full transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => { toggleArchive(record.id); onClose(); }}
              className="p-2 text-text-tertiary hover:bg-surface-hover rounded-full transition-colors"
            >
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Flagged items */}
      {(record.flaggedObjectiveMisses.length > 0 || record.flaggedSLABreaches.length > 0) && (
        <div className="bg-danger-subtle border border-danger/30 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-danger mb-2 flex items-center gap-2">
            <Flag className="w-4 h-4" /> Auto-flagged Agenda Items (require root-cause discussion)
          </h4>
          {record.flaggedObjectiveMisses.map((m, i) => (
            <div key={i} className="text-sm text-danger mb-1">⚠ Objective Miss: {m}</div>
          ))}
          {record.flaggedSLABreaches.map((b, i) => (
            <div key={i} className="text-sm text-danger mb-1">🚨 SLA Breach: {b}</div>
          ))}
        </div>
      )}

      {/* Agenda */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h4 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" /> Agenda
        </h4>
        {record.agendaItems.length > 0 ? (
          <ul className="text-sm text-text-primary space-y-1 list-none">
            {record.agendaItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-tertiary">No agenda items recorded.</p>
        )}
      </div>

      {/* ISO 9001 Input Checklist */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <button
          onClick={() => toggleSection('inputs')}
          className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
        >
          <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-accent" /> ISO 9001:2015 Cl.9.3 Input Checklist</span>
          {expandedSections['inputs'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {expandedSections['inputs'] && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(INPUT_LABELS) as (keyof typeof record.inputs)[]).map((key) => (
              <label key={key} className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={record.inputs[key]}
                  onChange={(e) =>
                    updateRecord(record.id, {
                      inputs: { ...record.inputs, [key]: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-accent mt-0.5"
                />
                <span>
                  {INPUT_LABELS[key]}
                  {inputSignals[key] && <span className="block text-[11px] text-text-tertiary">{inputSignals[key]} — verify before checking</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Minutes & Decisions */}
      <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
        <button
          onClick={() => toggleSection('minutes')}
          className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
        >
          <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Minutes & Decisions</span>
          {expandedSections['minutes'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {expandedSections['minutes'] && (
          <>
            <Labeled label="Minutes Summary">
              <textarea
                value={record.minutesSummary}
                onChange={(e) => updateRecord(record.id, { minutesSummary: e.target.value })}
                rows={4}
                placeholder="Meeting minutes summary..."
                className={`${inputCls} resize-none`}
              />
            </Labeled>
            <Labeled label="Decisions">
              <textarea
                value={record.decisions}
                onChange={(e) => updateRecord(record.id, { decisions: e.target.value })}
                rows={3}
                placeholder="Key decisions made..."
                className={`${inputCls} resize-none`}
              />
            </Labeled>
            <Labeled label="Minutes Reference / File Location">
              <input
                value={record.minutesRef ?? ''}
                onChange={(e) => updateRecord(record.id, { minutesRef: e.target.value })}
                placeholder="e.g. shared drive path or document ref"
                className={inputCls}
              />
            </Labeled>
          </>
        )}
      </div>

      {/* Action Items */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent" /> Action Items
          </h4>
          <button
            onClick={() =>
              addActionItem(record.id, {
                description: 'New action item',
                owner: '',
                dueDate: '',
                status: 'Open',
                mrmRef: record.meetingNo,
              })
            }
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {record.actionItems.map((a) => (
            <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-secondary">
              <div className="flex-1 space-y-1">
                <input
                  value={a.description}
                  onChange={(e) => updateActionItem(record.id, a.id, { description: e.target.value })}
                  className="w-full text-sm bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none text-text-primary"
                />
                <div className="flex items-center gap-3 text-xs text-text-tertiary flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <ChairpersonSelect value={a.owner} onChange={(v) => updateActionItem(record.id, a.id, { owner: v })} />
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <input
                      type="date"
                      value={a.dueDate}
                      onChange={(e) => updateActionItem(record.id, a.id, { dueDate: e.target.value })}
                      className="bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none"
                    />
                  </span>
                  {isActionOverdue(a) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
                  <input
                    value={a.clause ?? ''}
                    onChange={(e) => updateActionItem(record.id, a.id, { clause: e.target.value })}
                    placeholder="ISO clause"
                    className="w-20 bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none"
                  />
                  <input
                    value={a.evidence ?? ''}
                    onChange={(e) => updateActionItem(record.id, a.id, { evidence: e.target.value })}
                    placeholder="Closure evidence"
                    className="flex-1 min-w-[8rem] bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none"
                  />
                </div>
              </div>
              <select
                value={a.status}
                onChange={(e) =>
                  updateActionItem(record.id, a.id, {
                    status: e.target.value as MRMActionItem['status'],
                    closedAt: e.target.value === 'Closed' ? new Date().toISOString() : undefined,
                  })
                }
                className="text-xs border border-border rounded px-1 py-0.5 bg-surface text-text-secondary"
              >
                <option>Open</option>
                <option>In Progress</option>
                <option>Closed</option>
              </select>
              <button
                onClick={() => deleteActionItem(record.id, a.id)}
                className="p-1 text-text-tertiary hover:text-danger transition-colors"
                title="Remove action item"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {record.actionItems.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-3">No action items yet.</p>
          )}
        </div>
      </div>

      {/* Workflow state */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Workflow State</h3>
        <StateTransitionBar
          statuses={STATUSES}
          statusLabels={STATUS_LABELS}
          current={normalized}
          history={record.stateHistory}
          canAdvance={isMR}
          canVerifyClose={isMR}
          canReopen={isMR}
          onForward={(reason) => {
            const idx = STATUSES.indexOf(normalized);
            const next = STATUSES[idx + 1];
            if (next) transitionStatus(record.id, next, user?.name || 'System', reason, next === 'Approved' ? 'verify' : 'forward');
          }}
          onReject={(reason) => {
            const idx = STATUSES.indexOf(normalized);
            const prev = STATUSES[idx - 1];
            if (prev) transitionStatus(record.id, prev, user?.name || 'System', reason, 'reject');
          }}
          onReopen={(reason) => transitionStatus(record.id, 'Reviewed', user?.name || 'System', reason, 'reopen')}
        />
        {!isMR && (
          <p className="text-xs text-text-tertiary mt-2">Only Management Representative (Admin / QA Manager) can change this meeting's workflow stage.</p>
        )}
        {(record.reviewedBy || record.approvedBy) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1 text-sm text-text-secondary">
            {record.reviewedBy && <p><strong>Reviewed By:</strong> {record.reviewedBy} on {record.reviewDate ? new Date(record.reviewDate).toLocaleDateString() : '-'}</p>}
            {record.approvedBy && <p><strong>Approved By:</strong> {record.approvedBy} on {record.approvalDate ? new Date(record.approvalDate).toLocaleDateString() : '-'}</p>}
          </div>
        )}
      </section>

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-6 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="mrm" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="mrm" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}
    </div>
  );
}

function MRMDetailsEditForm({
  record,
  onSave,
  onCancel,
}: {
  record: MRMRecord;
  onSave: (data: Partial<MRMRecord>) => void;
  onCancel: () => void;
}) {
  const [meetingDate, setMeetingDate] = useState(record.meetingDate);
  const [chairperson, setChairperson] = useState(record.chairperson);
  const [venue, setVenue] = useState(record.venue);
  const [attendeesStr, setAttendeesStr] = useState(record.attendees.join(', '));

  return (
    <div className="mt-3 space-y-3 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Meeting Date">
          <input type="date" className={inputCls} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
        </Labeled>
        <Labeled label="Chairperson">
          <ChairpersonSelect value={chairperson} onChange={setChairperson} required />
        </Labeled>
      </div>
      <Labeled label="Venue">
        <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} />
      </Labeled>
      <Labeled label="Attendees (comma-separated)">
        <input className={inputCls} value={attendeesStr} onChange={(e) => setAttendeesStr(e.target.value)} />
      </Labeled>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-surface-hover transition-colors">Cancel</button>
        <button
          onClick={() =>
            onSave({
              meetingDate,
              chairperson,
              venue,
              attendees: attendeesStr.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
          className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function MRMFormModal({
  onClose,
  onSubmit,
  suggestedNo,
}: {
  onClose: () => void;
  onSubmit: (data: {
    meetingNo: string;
    meetingDate: string;
    chairperson: string;
    attendees: string[];
    venue: string;
    agendaItems: string[];
    minutesRef: string;
  }) => void;
  suggestedNo: string;
}) {
  const [meetingNo, setMeetingNo] = useState(suggestedNo);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [chairperson, setChairperson] = useState('');
  const [venue, setVenue] = useState('PTA Board Room — Jubail');
  const [attendeesStr, setAttendeesStr] = useState('General Manager, QA Manager, Operations Manager, Technical Director');
  const [minutesRef, setMinutesRef] = useState('');
  const [agendaStr, setAgendaStr] = useState(
    '1. Review of QMS Performance & KPIs\n2. NCR & CAPA Status Review\n3. Customer Satisfaction Index (CSI) Review\n4. Quality Objectives Progress\n5. Risk & Opportunities Update'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      meetingNo,
      meetingDate,
      chairperson,
      venue,
      attendees: attendeesStr.split(',').map((s) => s.trim()).filter(Boolean),
      agendaItems: agendaStr.split('\n').map((s) => s.trim()).filter(Boolean),
      minutesRef,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-border text-text-primary animate-modal-enter">
        <h3 className="text-xl font-bold text-text-primary mb-5">Schedule Management Review Meeting</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Meeting Number *">
              <input required value={meetingNo} onChange={(e) => setMeetingNo(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Meeting Date *">
              <input type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Chairperson *">
              <ChairpersonSelect value={chairperson} onChange={setChairperson} required />
            </Labeled>
            <Labeled label="Venue">
              <input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} />
            </Labeled>
          </div>
          <Labeled label="Attendees (comma-separated)">
            <input
              value={attendeesStr}
              onChange={(e) => setAttendeesStr(e.target.value)}
              placeholder="e.g. GM, QA Manager, Operations Manager"
              className={inputCls}
            />
          </Labeled>
          <Labeled label="Minutes Reference / File Location">
            <input
              value={minutesRef}
              onChange={(e) => setMinutesRef(e.target.value)}
              placeholder="e.g. shared drive path or document ref"
              className={inputCls}
            />
          </Labeled>
          <Labeled label="Agenda Items (one per line)">
            <textarea
              rows={4}
              value={agendaStr}
              onChange={(e) => setAgendaStr(e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
          </Labeled>
          <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg shadow-sm transition-colors"
            >
              Schedule Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
