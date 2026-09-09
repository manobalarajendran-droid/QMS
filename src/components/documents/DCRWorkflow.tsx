import { useState, useMemo, type ReactNode } from 'react';
import { useDCRStore } from '../../store/useDCRStore';
import type { DCRRecord, DCRStatus } from '../../store/useDCRStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';
import {
  CheckCircle,
  X,
  Paperclip,
  MessageSquare,
  Printer,
  Search,
  User as UserIcon,
  FileText,
} from 'lucide-react';

const STATUSES: DCRStatus[] = ['Draft', 'Pending Review', 'Pending QA Approval', 'Approved'];

const STATUS_LABELS: Record<DCRStatus, string> = {
  Draft: 'Draft',
  'Pending Review': 'Pending Review',
  'Pending QA Approval': 'Pending QA Approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Reviewed: 'Pending QA Approval',
  Implemented: 'Approved',
};

// Older persisted records may carry the pre-standard 'Reviewed'/'Implemented' values;
// map them onto the current 4-stage bar for display/navigation without rewriting stored data.
const LEGACY_STATUS_MAP: Partial<Record<DCRStatus, DCRStatus>> = {
  Reviewed: 'Pending QA Approval',
  Implemented: 'Approved',
};

function normalizeStatus(status: DCRStatus): DCRStatus {
  return LEGACY_STATUS_MAP[status] ?? status;
}

function getNextStatus(current: DCRStatus): DCRStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx === -1 || idx === STATUSES.length - 1) return null;
  return STATUSES[idx + 1];
}

function getPrevStatus(current: DCRStatus): DCRStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx <= 0) return null;
  return STATUSES[idx - 1];
}

function isOverdueDCR(record: DCRRecord): boolean {
  if (!record.dueDate) return false;
  const status = normalizeStatus(record.status);
  if (status === 'Approved' || record.status === 'Rejected') return false;
  return new Date(record.dueDate) < new Date(new Date().toDateString());
}

const inputCls = 'w-full border border-border bg-surface p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm';

export function DCRWorkflow() {
  const records = useDCRStore((s) => s.records);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | DCRStatus>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'due' | 'dcrNo'>('newest');

  const selected = records.find((r) => r.id === selectedId) || null;

  const assigneeOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.assignedTo).filter(Boolean))) as string[],
    [records]
  );

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (deptFilter !== 'All') {
      list = list.filter((r) => r.department === deptFilter);
    }
    if (assigneeFilter !== 'All') {
      list = list.filter((r) => r.assignedTo === assigneeFilter);
    }
    if (overdueOnly) {
      list = list.filter(isOverdueDCR);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.dcrNo || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.docNo || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'dcrNo') return (a.dcrNo || '').localeCompare(b.dcrNo || '');
      if (sortBy === 'due') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });
  }, [records, showArchived, statusFilter, deptFilter, assigneeFilter, overdueOnly, search, sortBy]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-2">
      {/* Left: filters + list */}
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Document Change Requests
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent text-accent-fg px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            + New DCR
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DCR no, title, doc no…"
            className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | DCRStatus)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
            <option value="Rejected">Rejected</option>
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
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due">Due date soonest</option>
            <option value="dcrNo">DCR No. A–Z</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
            Overdue only
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
            Show Archived
          </label>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredRecords.map((r) => {
            const overdue = isOverdueDCR(r);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedId === r.id
                    ? 'border-accent bg-accent-subtle shadow-sm'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-text-primary text-sm">{r.dcrNo}</span>
                  <div className="flex items-center gap-1">
                    {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
                    <StatusBadge status={STATUS_LABELS[r.status] ?? r.status} />
                  </div>
                </div>
                <div className="text-xs text-text-tertiary mt-1 truncate">{r.title || r.docNo}</div>
                {(r.assignedTo || r.department) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1.5 pt-1.5 border-t border-border">
                    {r.assignedTo && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.assignedTo}</span>}
                    {r.department && <span className="bg-surface-hover px-1.5 py-0.5 rounded border border-border">{r.department}</span>}
                  </div>
                )}
              </button>
            );
          })}
          {filteredRecords.length === 0 && <p className="text-xs text-center text-text-tertiary py-5">No DCRs found.</p>}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <DCRDetailPanel record={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a Document Change Request to view details</p>
          </div>
        )}
      </div>

      {showForm && (
        <DCRFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            useDCRStore.getState().addRecord({ ...data, status: 'Draft' } as Omit<DCRRecord, 'id' | 'dcrNo' | 'createdAt' | 'updatedAt'>);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

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

function DCRDetailPanel({ record, onClose }: { record: DCRRecord; onClose: () => void }) {
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const [showEdit, setShowEdit] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [gateReason, setGateReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const projectId = record.docNo || record.id;
  const overdue = isOverdueDCR(record);
  const normalized = normalizeStatus(record.status);
  const atFinalGate = record.status !== 'Rejected' && normalized === 'Pending QA Approval';

  const hasImportedFields = !!(record.dt || record.ref || record.reqBy || record.docTitle);
  const hasApprovalTrail = !!(record.reviewedBy || record.approvedBy || record.rejectedBy);

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-text-primary">{record.dcrNo}</h2>
            <StatusBadge status={STATUS_LABELS[record.status] ?? record.status} />
            {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
          </div>
          <div className="flex items-center gap-1 print:hidden">
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
                if (window.confirm('Delete this DCR?')) {
                  useDCRStore.getState().deleteRecord(record.id);
                  onClose();
                }
              }}
              className="p-2 text-danger-text hover:bg-danger-subtle rounded-full transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => {
                useDCRStore.getState().updateRecord(record.id, { isArchived: !record.isArchived });
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
        <div className="text-sm text-text-tertiary mb-4">{record.docNo} — {record.title}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Requestor" value={record.requestor} />
          <InfoField label="Department" value={record.department} />
          <InfoField label="Assigned To" value={record.assignedTo} />
          <InfoField label="Due Date" value={record.dueDate} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Description of Change</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.changeDescription}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Reason for Change</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.reason}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <InfoField label="Revision No." value={record.revNo} />
          <InfoField label="Summary" value={record.summary} />
          <InfoField label="Comments" value={record.comments} />
        </div>
      </div>

      {hasImportedFields && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Imported Record Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Legacy Ref" value={record.ref} />
            <InfoField label="Legacy Date" value={record.dt} />
            <InfoField label="Requested By (legacy)" value={record.reqBy} />
            <InfoField label="Document Title (legacy)" value={record.docTitle} />
          </div>
        </div>
      )}

      {hasApprovalTrail && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Review / Approval Trail</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {record.reviewedBy && <InfoField label="Reviewed By" value={`${record.reviewedBy}${record.reviewDate ? ` (${record.reviewDate})` : ''}`} />}
            {record.reviewComments && <InfoField label="Review Comments" value={record.reviewComments} />}
            {record.approvedBy && <InfoField label="Approved By" value={`${record.approvedBy}${record.approvalDate ? ` (${record.approvalDate})` : ''}`} />}
            {record.approvalComments && <InfoField label="Approval Comments" value={record.approvalComments} />}
            {record.rejectedBy && <InfoField label="Rejected By" value={`${record.rejectedBy}${record.rejectionDate ? ` (${record.rejectionDate})` : ''}`} />}
            {record.rejectionReason && <InfoField label="Rejection Reason" value={record.rejectionReason} />}
          </div>
        </div>
      )}

      {atFinalGate && (
        <div className="bg-surface-secondary p-4 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">QA Approval Gate</h3>
          {isMR ? (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={gateReason}
                onChange={(e) => setGateReason(e.target.value)}
                placeholder="Approval / rejection comments (required)"
                className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-4">
                <button
                  disabled={!gateReason.trim()}
                  onClick={() => {
                    useDCRStore.getState().approveDCR(record.id, user?.name || 'System', gateReason.trim());
                    setGateReason('');
                  }}
                  className="bg-success text-success-fg px-4 py-2.5 rounded-lg font-semibold hover:bg-success/90 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Approve &amp; Sync to DML
                </button>
                <button
                  disabled={!gateReason.trim()}
                  onClick={() => {
                    useDCRStore.getState().rejectDCR(record.id, user?.name || 'System', gateReason.trim());
                    setGateReason('');
                  }}
                  className="bg-surface text-text-primary border border-border px-4 py-2.5 rounded-lg font-semibold hover:bg-surface-hover disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  <X className="w-5 h-5" /> Reject Request
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-danger-subtle border border-border p-4 rounded-lg">
              <p className="text-sm text-danger-text font-medium">Only Management Representative (Admin / QA Manager) can approve or reject this DCR.</p>
            </div>
          )}
        </div>
      )}

      {record.status === 'Rejected' ? (
        <div className="bg-danger-subtle p-4 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-danger-text mb-2">Request Rejected</h3>
          <p className="text-sm text-text-secondary mb-4">{record.rejectionReason || 'No rejection reason recorded.'}</p>
          {isMR ? (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Reason for reopening (required)"
                className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                disabled={!reopenReason.trim()}
                onClick={() => {
                  useDCRStore.getState().transitionStatus(record.id, 'Draft', user?.name || 'System', reopenReason.trim(), 'reopen');
                  setReopenReason('');
                }}
                className="bg-accent text-accent-fg px-4 py-2.5 rounded-lg font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                Reopen to Draft
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Only Management Representative (Admin / QA Manager) can reopen a rejected DCR.</p>
          )}
        </div>
      ) : (
        <section className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Workflow State</h3>
          <StateTransitionBar
            statuses={STATUSES}
            statusLabels={STATUS_LABELS}
            current={normalized}
            history={record.stateHistory}
            canAdvance={isMR && !atFinalGate}
            canVerifyClose={isMR}
            canReopen={isMR}
            onForward={(reason) => {
              if (normalized === 'Pending Review') {
                useDCRStore.getState().reviewDCR(record.id, user?.name || 'System', reason);
              } else {
                const next = getNextStatus(record.status);
                if (next) useDCRStore.getState().transitionStatus(record.id, next, user?.name || 'System', reason, 'forward');
              }
            }}
            onReject={(reason) => {
              const prev = getPrevStatus(record.status);
              if (prev) useDCRStore.getState().transitionStatus(record.id, prev, user?.name || 'System', reason, 'reject');
            }}
            onReopen={(reason) => useDCRStore.getState().transitionStatus(record.id, 'Draft', user?.name || 'System', reason, 'reopen')}
          />
          {!isMR && (
            <p className="text-xs text-text-tertiary mt-2">Only Management Representative (Admin / QA Manager) can change this DCR's workflow stage.</p>
          )}
        </section>
      )}

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-4 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="dcr" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="dcr" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}

      {showEdit && (
        <DCRFormModal
          initial={record}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => {
            useDCRStore.getState().updateRecord(record.id, data);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

interface DCRFormData {
  docNo: string;
  title: string;
  requestor: string;
  department: string;
  changeDescription: string;
  reason: string;
  assignedTo: string;
  dueDate: string;
  revNo: string;
  summary: string;
  comments: string;
}

function DCRFormModal({
  onClose,
  onSubmit,
  initial,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<DCRRecord>) => void;
  initial?: DCRRecord;
}) {
  const authUsers = useAuthStore((s) => s.users);

  const [formData, setFormData] = useState<DCRFormData>({
    docNo: initial?.docNo ?? '',
    title: initial?.title ?? '',
    requestor: initial?.requestor ?? '',
    department: initial?.department ?? '',
    changeDescription: initial?.changeDescription ?? '',
    reason: initial?.reason ?? '',
    assignedTo: initial?.assignedTo ?? '',
    dueDate: initial?.dueDate ?? '',
    revNo: initial?.revNo ?? '',
    summary: initial?.summary ?? '',
    comments: initial?.comments ?? '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-3xl rounded-xl p-4 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold mb-4">{initial ? 'Edit Change Request' : 'New Change Request'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, docId: initial?.docId ?? '' }); }} className="space-y-4">
          <fieldset className="grid grid-cols-2 gap-4">
            <Labeled label="Document Number">
              <input className={inputCls} value={formData.docNo} onChange={(e) => setFormData({ ...formData, docNo: e.target.value })} placeholder="e.g. PTA-HSE-P-02" required />
            </Labeled>
            <Labeled label="Document Title">
              <input className={inputCls} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </Labeled>
            <Labeled label="Requestor">
              <select className={inputCls} value={formData.requestor} onChange={(e) => setFormData({ ...formData, requestor: e.target.value })} required>
                <option value="">— Select —</option>
                {authUsers.map((u) => (
                  <option key={u.id} value={u.displayName}>{u.displayName}</option>
                ))}
                {formData.requestor && !authUsers.some((u) => u.displayName === formData.requestor) && (
                  <option value={formData.requestor}>{formData.requestor}</option>
                )}
              </select>
            </Labeled>
            <Labeled label="Department">
              <DeptSelect value={formData.department} onChange={(v) => setFormData({ ...formData, department: v })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-4">
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
            <Labeled label="Due Date">
              <input type="date" className={inputCls} value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset className="space-y-3">
            <Labeled label="Description of Change">
              <textarea className={inputCls} rows={3} value={formData.changeDescription} onChange={(e) => setFormData({ ...formData, changeDescription: e.target.value })} required />
            </Labeled>
            <Labeled label="Reason for Change">
              <textarea className={inputCls} rows={2} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-3 gap-4">
            <Labeled label="Revision No.">
              <input className={inputCls} value={formData.revNo} onChange={(e) => setFormData({ ...formData, revNo: e.target.value })} />
            </Labeled>
            <Labeled label="Summary">
              <input className={inputCls} value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} />
            </Labeled>
            <Labeled label="Comments">
              <input className={inputCls} value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} />
            </Labeled>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-surface-hover">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover">{initial ? 'Save Changes' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
