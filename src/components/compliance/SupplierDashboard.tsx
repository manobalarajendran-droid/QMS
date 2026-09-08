import { useMemo, useState, type ReactNode } from 'react';
import { useSupplierEvalStore } from '../../store/useSupplierEvalStore';
import type { SupplierEvalRecord, SupplierStatus } from '../../store/useSupplierEvalStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';
import {
  Building2,
  Plus,
  ShieldCheck,
  X,
  Paperclip,
  MessageSquare,
  Printer,
  Search,
  User as UserIcon,
} from 'lucide-react';

const STATUSES: SupplierStatus[] = ['Under Evaluation', 'Approved'];

// Older persisted records may carry the pre-standard 'Pending Evaluation' value;
// map it onto the current bar for display/navigation without rewriting stored data.
function normalizeStatus(status: SupplierStatus): SupplierStatus {
  return status === 'Pending Evaluation' ? 'Under Evaluation' : status;
}

function isOverdueSupplier(record: SupplierEvalRecord): boolean {
  if (!record.nextEvalDate || record.status === 'Rejected') return false;
  return new Date(record.nextEvalDate) < new Date(new Date().toDateString());
}

const inputCls = 'w-full border border-border bg-surface p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm';

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</span>
      {children}
    </label>
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

function UserSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const authUsers = useAuthStore((s) => s.users);
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {authUsers.map((u) => (
        <option key={u.id} value={u.displayName}>{u.displayName}</option>
      ))}
      {value && !authUsers.some((u) => u.displayName === value) && <option value={value}>{value}</option>}
    </select>
  );
}

export function SupplierDashboard() {
  const records = useSupplierEvalStore((s) => s.records);
  const addRecord = useSupplierEvalStore((s) => s.addRecord);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | SupplierStatus>('All');
  const [classFilter, setClassFilter] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score' | 'nextEval'>('newest');

  const selected = records.find((r) => r.id === selectedId) || null;

  const avgScore = records.length ? Math.round(records.reduce((a, b) => a + b.score, 0) / records.length) : 0;
  const approvedCount = records.filter((r) => r.status === 'Approved').length;

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (classFilter !== 'All') {
      list = list.filter((r) => r.classification === classFilter);
    }
    if (deptFilter !== 'All') {
      list = list.filter((r) => r.assignedDept === deptFilter);
    }
    if (overdueOnly) {
      list = list.filter(isOverdueSupplier);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.contactPerson || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'nextEval') {
        const da = a.nextEvalDate ? new Date(a.nextEvalDate).getTime() : Infinity;
        const db = b.nextEvalDate ? new Date(b.nextEvalDate).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });
  }, [records, showArchived, statusFilter, classFilter, deptFilter, overdueOnly, search, sortBy]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-2">
      {/* Left: filters + list */}
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className="text-2xl font-bold text-success">{approvedCount}</div>
            <div className="text-xs text-text-tertiary">Approved</div>
          </div>
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className="text-2xl font-bold text-accent">{avgScore}%</div>
            <div className="text-xs text-text-tertiary">Avg Score</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" /> AVL
            </h2>
            <p className="text-xs text-text-tertiary">Approved Vendor List</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm bg-accent text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, category, contact…"
            className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | SupplierStatus)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Statuses</option>
            <option value="Under Evaluation">Under Evaluation</option>
            <option value="Approved">Approved</option>
            <option value="Conditional">Conditional</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value as 'All' | 'A' | 'B' | 'C')} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Classes</option>
            <option value="A">Class A</option>
            <option value="B">Class B</option>
            <option value="C">Class C</option>
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Departments</option>
            {PTA_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score">Score highest</option>
            <option value="nextEval">Next eval soonest</option>
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
            const overdue = isOverdueSupplier(r);
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
                  <span className="font-semibold text-text-primary text-sm truncate">{r.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-text-tertiary truncate">{r.category}{r.classification ? ` · Class ${r.classification}` : ''}</div>
                  <div className="text-xs font-bold text-accent shrink-0">{r.score}%</div>
                </div>
                {(r.assignedTo || r.assignedDept) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1.5 pt-1.5 border-t border-border">
                    {r.assignedTo && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.assignedTo}</span>}
                    {r.assignedDept && <span className="bg-surface-hover px-1.5 py-0.5 rounded border border-border">{r.assignedDept}</span>}
                  </div>
                )}
              </button>
            );
          })}
          {filteredRecords.length === 0 && <p className="text-xs text-center text-text-tertiary py-8">No suppliers in AVL.</p>}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <SupplierDetailPanel record={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary bg-surface rounded-xl border border-border">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a supplier to view evaluation details</p>
          </div>
        )}
      </div>

      {showForm && (
        <SupplierFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            addRecord({ ...data, status: 'Under Evaluation', score: 0, findings: '' });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SupplierDetailPanel({ record, onClose }: { record: SupplierEvalRecord; onClose: () => void }) {
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const updateRecord = useSupplierEvalStore((s) => s.updateRecord);
  const deleteRecord = useSupplierEvalStore((s) => s.deleteRecord);
  const toggleArchive = useSupplierEvalStore((s) => s.toggleArchive);
  const approveSupplier = useSupplierEvalStore((s) => s.approveSupplier);
  const markConditional = useSupplierEvalStore((s) => s.markConditional);
  const rejectSupplier = useSupplierEvalStore((s) => s.rejectSupplier);
  const reopenSupplier = useSupplierEvalStore((s) => s.reopenSupplier);

  const [showEdit, setShowEdit] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [gateAction, setGateAction] = useState<'approve' | 'conditional' | 'reject' | null>(null);
  const [gateReason, setGateReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const projectId = record.id;
  const overdue = isOverdueSupplier(record);
  const normalized = normalizeStatus(record.status);
  const isBranchTerminal = normalized === 'Conditional' || normalized === 'Rejected';

  function submitGate() {
    if (!gateReason.trim() || !gateAction) return;
    if (gateAction === 'approve') approveSupplier(record.id, user?.name || 'System', gateReason.trim());
    else if (gateAction === 'conditional') markConditional(record.id, user?.name || 'System', gateReason.trim());
    else rejectSupplier(record.id, user?.name || 'System', gateReason.trim());
    setGateAction(null);
    setGateReason('');
  }

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              {record.name}
              {record.status === 'Approved' && <ShieldCheck className="w-5 h-5 text-success" />}
            </h2>
            <StatusBadge status={record.status} />
            {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
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
                if (window.confirm('Delete this supplier record?')) {
                  deleteRecord(record.id);
                  onClose();
                }
              }}
              className="p-2 text-danger hover:bg-danger-subtle rounded-full transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => {
                toggleArchive(record.id);
                onClose();
              }}
              className="p-2 text-warning hover:bg-warning-subtle rounded-full transition-colors"
            >
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="text-sm text-text-tertiary mb-4">{record.category}{record.classification ? ` · Class ${record.classification}` : ''}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Assigned To" value={record.assignedTo} />
          <InfoField label="Assigned Dept" value={record.assignedDept} />
          <InfoField label="Score" value={`${record.score}%`} />
          <InfoField label="Next Evaluation" value={record.nextEvalDate} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Supplier Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Contact Person" value={record.contactPerson} />
          <InfoField label="Email" value={record.email} />
          <InfoField label="Last Evaluation" value={record.lastEvalDate} />
          <InfoField label="Scope of Supply" value={record.scope} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Findings / Remarks</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.findings || '—'}</p>
        </div>
      </div>

      {(normalized === 'Conditional' || normalized === 'Rejected' || record.correctiveAction || record.correctiveOwner) && (
        <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Corrective Action</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Corrective Action">
              <textarea
                className={inputCls}
                rows={2}
                value={record.correctiveAction ?? ''}
                onChange={(e) => updateRecord(record.id, { correctiveAction: e.target.value })}
                placeholder="Describe the corrective action required…"
              />
            </Labeled>
            <Labeled label="Owner">
              <UserSelect value={record.correctiveOwner ?? ''} onChange={(v) => updateRecord(record.id, { correctiveOwner: v })} />
            </Labeled>
            <Labeled label="Target Date">
              <input type="date" className={inputCls} value={record.correctiveTargetDate ?? ''} onChange={(e) => updateRecord(record.id, { correctiveTargetDate: e.target.value })} />
            </Labeled>
            <Labeled label="Completion Date">
              <input type="date" className={inputCls} value={record.correctiveCompletionDate ?? ''} onChange={(e) => updateRecord(record.id, { correctiveCompletionDate: e.target.value })} />
            </Labeled>
          </div>
        </div>
      )}

      {(record.approvedBy || record.rejectedBy) && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Evaluation Trail</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {record.approvedBy && <InfoField label="Approved By" value={`${record.approvedBy}${record.approvalDate ? ` (${record.approvalDate})` : ''}`} />}
            {record.approvalComments && <InfoField label="Approval Comments" value={record.approvalComments} />}
            {record.rejectedBy && <InfoField label="Rejected By" value={`${record.rejectedBy}${record.rejectionDate ? ` (${record.rejectionDate})` : ''}`} />}
            {record.rejectionReason && <InfoField label="Rejection Reason" value={record.rejectionReason} />}
          </div>
        </div>
      )}

      {normalized === 'Under Evaluation' && (
        <div className="bg-surface-secondary p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Evaluation Gate</h3>
          {isMR ? (
            gateAction ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Reason for {gateAction === 'approve' ? 'approval' : gateAction === 'conditional' ? 'conditional approval' : 'rejection'} (required)
                </label>
                <textarea
                  autoFocus
                  rows={2}
                  value={gateReason}
                  onChange={(e) => setGateReason(e.target.value)}
                  placeholder="Explain the evaluation outcome…"
                  className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setGateAction(null); setGateReason(''); }} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={submitGate}
                    disabled={!gateReason.trim()}
                    className="px-3 py-1.5 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setGateAction('approve')}
                  className="bg-success text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Approve Supplier
                </button>
                <button
                  onClick={() => setGateAction('conditional')}
                  className="bg-warning text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Mark Conditional
                </button>
                <button
                  onClick={() => setGateAction('reject')}
                  className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Reject Supplier
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-text-tertiary">Only QA Manager / Admin can record the evaluation outcome.</p>
          )}
        </div>
      )}

      {isBranchTerminal ? (
        <div className="bg-danger-subtle p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-danger mb-2">
            {normalized === 'Conditional' ? 'Conditionally Approved' : 'Supplier Rejected'}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {record.stateHistory?.length
              ? record.stateHistory[record.stateHistory.length - 1].reason
              : record.rejectionReason || 'No reason recorded.'}
          </p>
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
                  reopenSupplier(record.id, user?.name || 'System', reopenReason.trim());
                  setReopenReason('');
                }}
                className="bg-accent text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                Reopen for Re-Evaluation
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Only QA Manager / Admin can reopen this supplier for re-evaluation.</p>
          )}
        </div>
      ) : normalized === 'Approved' ? (
        <section className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Workflow State</h3>
          <StateTransitionBar
            statuses={STATUSES}
            statusLabels={{ 'Under Evaluation': 'Under Evaluation', Approved: 'Approved' }}
            current={normalized}
            history={record.stateHistory}
            canAdvance={false}
            canVerifyClose={isMR}
            canReopen={isMR}
            onForward={() => {}}
            onReject={() => {}}
            onReopen={(reason) => reopenSupplier(record.id, user?.name || 'System', reason)}
          />
          {!isMR && (
            <p className="text-xs text-text-tertiary mt-2">Only QA Manager / Admin can reopen this supplier for re-evaluation.</p>
          )}
        </section>
      ) : null}

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-6 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="supplier" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="supplier" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}

      {showEdit && (
        <SupplierFormModal
          initial={record}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => {
            updateRecord(record.id, data);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

interface SupplierFormData {
  name: string;
  category: string;
  classification: '' | 'A' | 'B' | 'C';
  scope: string;
  contactPerson: string;
  email: string;
  lastEvalDate: string;
  nextEvalDate: string;
  assignedTo: string;
  assignedDept: string;
}

type SupplierFormSubmitData = Omit<SupplierFormData, 'classification'> & { classification?: 'A' | 'B' | 'C' };

function SupplierFormModal({
  onClose,
  onSubmit,
  initial,
}: {
  onClose: () => void;
  onSubmit: (data: SupplierFormSubmitData) => void;
  initial?: SupplierEvalRecord;
}) {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: initial?.name ?? '',
    category: initial?.category ?? 'General',
    classification: initial?.classification ?? '',
    scope: initial?.scope ?? '',
    contactPerson: initial?.contactPerson ?? '',
    email: initial?.email ?? '',
    lastEvalDate: initial?.lastEvalDate ?? '',
    nextEvalDate: initial?.nextEvalDate ?? '',
    assignedTo: initial?.assignedTo ?? '',
    assignedDept: initial?.assignedDept ?? '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-2xl rounded-xl p-6 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold mb-4 text-text-primary">{initial ? 'Edit Supplier' : 'Add New Supplier'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ ...formData, classification: formData.classification || undefined });
          }}
          className="space-y-6"
        >
          <fieldset className="grid grid-cols-2 gap-4">
            <Labeled label="Supplier Name *">
              <input className={inputCls} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Acme Precision Tools" required />
            </Labeled>
            <Labeled label="Category *">
              <input className={inputCls} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Mechanical, Calibration, Software" required />
            </Labeled>
            <Labeled label="Classification">
              <select className={inputCls} value={formData.classification} onChange={(e) => setFormData({ ...formData, classification: e.target.value as SupplierFormData['classification'] })}>
                <option value="">— None —</option>
                <option value="A">Class A (Critical)</option>
                <option value="B">Class B (Major)</option>
                <option value="C">Class C (Minor)</option>
              </select>
            </Labeled>
            <Labeled label="Scope of Supply">
              <input className={inputCls} value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} placeholder="What this supplier provides" />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-4">
            <Labeled label="Assigned To (Owner)">
              <UserSelect value={formData.assignedTo} onChange={(v) => setFormData({ ...formData, assignedTo: v })} />
            </Labeled>
            <Labeled label="Assigned Department">
              <DeptSelect value={formData.assignedDept} onChange={(v) => setFormData({ ...formData, assignedDept: v })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Contact Person">
              <input className={inputCls} value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="e.g. John Doe" />
            </Labeled>
            <Labeled label="Email">
              <input type="email" className={inputCls} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="e.g. contact@supplier.com" />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Last Evaluation Date">
              <input type="date" className={inputCls} value={formData.lastEvalDate} onChange={(e) => setFormData({ ...formData, lastEvalDate: e.target.value })} />
            </Labeled>
            <Labeled label="Next Evaluation Date">
              <input type="date" className={inputCls} value={formData.nextEvalDate} onChange={(e) => setFormData({ ...formData, nextEvalDate: e.target.value })} />
            </Labeled>
          </fieldset>

          <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg shadow-sm transition-colors">
              {initial ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
