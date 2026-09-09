import { useState, useMemo, type ReactNode } from 'react';
import {
  ClipboardList, Plus, Search, Calendar, CheckCircle2, X,
  Paperclip, MessageSquare, Printer, User as UserIcon, Link as LinkIcon,
} from 'lucide-react';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import type { AuditProgrammeRecord, AuditProgrammeRecordStatus } from '../../store/useAuditProgrammeStore';
import { useNCRStore } from '../../store/useNCRStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';

const STATUSES: AuditProgrammeRecordStatus[] = ['Planned', 'In Progress', 'Completed', 'Follow-up'];

const STATUS_LABELS: Record<AuditProgrammeRecordStatus, string> = {
  Planned: 'Planned',
  'In Progress': 'In Progress',
  Completed: 'Completed',
  'Follow-up': 'Follow-up',
  'Report Issued': 'Completed',
};

// Older persisted records may carry the pre-standard 'Report Issued' value;
// map it onto the current 4-stage bar for display/navigation without rewriting stored data.
const LEGACY_STATUS_MAP: Partial<Record<AuditProgrammeRecordStatus, AuditProgrammeRecordStatus>> = {
  'Report Issued': 'Completed',
};

function normalizeStatus(status: AuditProgrammeRecordStatus): AuditProgrammeRecordStatus {
  return LEGACY_STATUS_MAP[status] ?? status;
}

function getNextStatus(current: AuditProgrammeRecordStatus): AuditProgrammeRecordStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx === -1 || idx === STATUSES.length - 1) return null;
  return STATUSES[idx + 1];
}

function getPrevStatus(current: AuditProgrammeRecordStatus): AuditProgrammeRecordStatus | null {
  const idx = STATUSES.indexOf(normalizeStatus(current));
  if (idx <= 0) return null;
  return STATUSES[idx - 1];
}

function isOverdueAudit(record: AuditProgrammeRecord): boolean {
  const status = normalizeStatus(record.status);
  if (status === 'Follow-up') {
    if (!record.followUpDate) return false;
    return new Date(record.followUpDate) < new Date(new Date().toDateString());
  }
  if (status === 'Completed') return false;
  if (!record.dt) return false;
  return new Date(record.dt) < new Date(new Date().toDateString());
}

const inputCls = 'w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary text-sm transition-colors';

export function AuditProgramme() {
  const records = useAuditProgrammeStore((s) => s.records);
  const ncrRecords = useNCRStore((s) => s.records);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | AuditProgrammeRecordStatus>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [auditorFilter, setAuditorFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'due' | 'ref'>('newest');

  const selected = records.find((r) => r.id === selectedId) || null;

  const auditorOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.aud).filter(Boolean))) as string[],
    [records]
  );

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter !== 'All') {
      list = list.filter((r) => normalizeStatus(r.status) === normalizeStatus(statusFilter));
    }
    if (deptFilter !== 'All') {
      list = list.filter((r) => r.dep === deptFilter);
    }
    if (auditorFilter !== 'All') {
      list = list.filter((r) => r.aud === auditorFilter);
    }
    if (overdueOnly) {
      list = list.filter(isOverdueAudit);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.ref || '').toLowerCase().includes(q) ||
          (r.sc || '').toLowerCase().includes(q) ||
          (r.dep || '').toLowerCase().includes(q) ||
          (r.aud || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'ref') return (a.ref || '').localeCompare(b.ref || '');
      if (sortBy === 'due') {
        const da = a.dt ? new Date(a.dt).getTime() : Infinity;
        const db = b.dt ? new Date(b.dt).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });
  }, [records, showArchived, statusFilter, deptFilter, auditorFilter, overdueOnly, search, sortBy]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-2">
      {/* Left: filters + list */}
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" /> Audit Programme
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-accent-fg px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Audit
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, scope, department…"
            className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | AuditProgrammeRecordStatus)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
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
          <select value={auditorFilter} onChange={(e) => setAuditorFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Auditors</option>
            {auditorOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due">Due date soonest</option>
            <option value="ref">Ref A–Z</option>
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
            const overdue = isOverdueAudit(r);
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
                  <span className="font-semibold text-text-primary text-sm">{r.ref}</span>
                  <div className="flex items-center gap-1">
                    {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
                    <StatusBadge status={STATUS_LABELS[r.status] ?? r.status} />
                  </div>
                </div>
                <div className="text-xs text-text-tertiary mt-1 truncate">{r.sc}</div>
                {(r.aud || r.dep) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1.5 pt-1.5 border-t border-border">
                    {r.aud && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.aud}</span>}
                    {r.dep && <span className="bg-surface-hover px-1.5 py-0.5 rounded border border-border">{r.dep}</span>}
                  </div>
                )}
              </button>
            );
          })}
          {filteredRecords.length === 0 && <p className="text-xs text-center text-text-tertiary py-5">No audits found.</p>}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <AuditDetailPanel record={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select an audit record to view details</p>
          </div>
        )}
      </div>

      {showForm && (
        <AuditFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            useAuditProgrammeStore.getState().addRecord({ ...data, status: 'Planned' } as Omit<AuditProgrammeRecord, 'id' | 'createdAt' | 'updatedAt'>);
            setShowForm(false);
          }}
          ncrRecords={ncrRecords}
        />
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{label}</h4>
      <p className="text-sm text-text-primary whitespace-pre-wrap">{value === 0 ? '0' : value || '—'}</p>
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

function AuditDetailPanel({ record, onClose }: { record: AuditProgrammeRecord; onClose: () => void }) {
  const { user } = useAuth();
  const ncrRecords = useNCRStore((s) => s.records);
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const [showEdit, setShowEdit] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const projectId = record.ref || record.id;
  const overdue = isOverdueAudit(record);
  const normalized = normalizeStatus(record.status);
  const isTerminal = normalized === 'Follow-up';

  const linkedNcrs = (record.ncrIds || [])
    .map((id) => ncrRecords.find((n) => n.id === id))
    .filter(Boolean) as typeof ncrRecords;

  const hasApprovalTrail = !!(record.reviewedBy || record.approvedBy || record.rejectedBy);

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-text-primary">{record.ref}</h2>
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
                if (window.confirm('Delete this audit record?')) {
                  useAuditProgrammeStore.getState().deleteRecord(record.id);
                  onClose();
                }
              }}
              className="p-2 text-danger-text hover:bg-danger-subtle rounded-full transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => {
                useAuditProgrammeStore.getState().toggleArchive(record.id);
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
        <div className="text-sm text-text-tertiary mb-4">{record.sc}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Auditor" value={record.aud} />
          <InfoField label="Auditee" value={record.auditee} />
          <InfoField label="Department" value={record.dep} />
          <InfoField label={normalized === 'Follow-up' ? 'Follow-up Due Date' : 'Due Date'} value={normalized === 'Follow-up' ? record.followUpDate : record.dt} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Findings</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.fnd || '—'}</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <InfoField label="Phase" value={record.phase} />
          <InfoField label="NC Count" value={record.nc} />
          <InfoField label="Observation Count" value={record.obs} />
          <InfoField label="Report Ref" value={record.rpt} />
        </div>
      </div>

      {linkedNcrs.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Linked NCRs
          </h3>
          <div className="space-y-2">
            {linkedNcrs.map((ncr) => (
              <div key={ncr!.id} className="flex flex-col p-2 rounded-lg border border-border bg-surface-secondary">
                <span className="text-sm font-medium text-text-primary">{ncr!.ref || 'Unnamed NCR'}</span>
                <span className="text-xs text-text-secondary">{ncr!.desc}</span>
              </div>
            ))}
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

      {isTerminal ? (
        <div className="bg-surface-secondary p-4 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-2">Follow-up Verified</h3>
          <p className="text-sm text-text-secondary mb-4">
            {record.completedDate ? `Audit report issued ${record.completedDate}. ` : ''}
            Follow-up on findings has been verified and this audit is closed.
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
                  useAuditProgrammeStore.getState().transitionStatus(record.id, 'In Progress', user?.name || 'System', reopenReason.trim(), 'reopen');
                  setReopenReason('');
                }}
                className="bg-accent text-accent-fg px-4 py-2.5 rounded-lg font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                Reopen to In Progress
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Only Management Representative (Admin / QA Manager) can reopen a closed audit.</p>
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
            canAdvance={isMR}
            canVerifyClose={isMR}
            canReopen={isMR}
            onForward={(reason) => {
              const next = getNextStatus(record.status);
              if (next) useAuditProgrammeStore.getState().transitionStatus(record.id, next, user?.name || 'System', reason, next === 'Follow-up' ? 'verify' : 'forward');
            }}
            onReject={(reason) => {
              const prev = getPrevStatus(record.status);
              if (prev) useAuditProgrammeStore.getState().transitionStatus(record.id, prev, user?.name || 'System', reason, 'reject');
            }}
            onReopen={(reason) => useAuditProgrammeStore.getState().transitionStatus(record.id, 'In Progress', user?.name || 'System', reason, 'reopen')}
          />
          {!isMR && (
            <p className="text-xs text-text-tertiary mt-2">Only Management Representative (Admin / QA Manager) can change this audit's workflow stage.</p>
          )}
        </section>
      )}

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-4 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="audit" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="audit" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}

      {showEdit && (
        <AuditFormModal
          initial={record}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => {
            useAuditProgrammeStore.getState().updateRecord(record.id, data);
            setShowEdit(false);
          }}
          ncrRecords={ncrRecords}
        />
      )}
    </div>
  );
}

interface AuditFormData {
  ref: string;
  sc: string;
  aud: string;
  auditee: string;
  dep: string;
  dt: string;
  followUpDate: string;
  nc: number;
  obs: number;
  fnd: string;
  rpt: string;
  ncrIds: string[];
}

function AuditFormModal({
  onClose,
  onSubmit,
  initial,
  ncrRecords,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<AuditProgrammeRecord>) => void;
  initial?: AuditProgrammeRecord;
  ncrRecords: ReturnType<typeof useNCRStore.getState>['records'];
}) {
  const authUsers = useAuthStore((s) => s.users);

  const [formData, setFormData] = useState<AuditFormData>({
    ref: initial?.ref ?? '',
    sc: initial?.sc ?? '',
    aud: initial?.aud ?? '',
    auditee: initial?.auditee ?? '',
    dep: initial?.dep ?? '',
    dt: initial?.dt ?? '',
    followUpDate: initial?.followUpDate ?? '',
    nc: typeof initial?.nc === 'number' ? initial.nc : Number(initial?.nc) || 0,
    obs: typeof initial?.obs === 'number' ? initial.obs : Number(initial?.obs) || 0,
    fnd: initial?.fnd ?? '',
    rpt: initial?.rpt ?? '',
    ncrIds: initial?.ncrIds ?? [],
  });

  const toggleNcrLink = (ncrId: string) => {
    setFormData((prev) => {
      const current = prev.ncrIds;
      return current.includes(ncrId)
        ? { ...prev, ncrIds: current.filter((id) => id !== ncrId) }
        : { ...prev, ncrIds: [...current, ncrId] };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-3xl rounded-xl p-4 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold mb-4">{initial ? 'Edit Audit Record' : 'New Audit Record'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <fieldset className="grid grid-cols-2 gap-4">
            <Labeled label="Ref Number">
              <input className={inputCls} value={formData.ref} onChange={(e) => setFormData({ ...formData, ref: e.target.value })} placeholder="e.g. IA-2026-14" required />
            </Labeled>
            <Labeled label="Scope">
              <input className={inputCls} value={formData.sc} onChange={(e) => setFormData({ ...formData, sc: e.target.value })} required />
            </Labeled>
            <Labeled label="Auditor">
              <select className={inputCls} value={formData.aud} onChange={(e) => setFormData({ ...formData, aud: e.target.value })} required>
                <option value="">— Select —</option>
                {authUsers.map((u) => (
                  <option key={u.id} value={u.displayName}>{u.displayName}</option>
                ))}
                {formData.aud && !authUsers.some((u) => u.displayName === formData.aud) && (
                  <option value={formData.aud}>{formData.aud}</option>
                )}
              </select>
            </Labeled>
            <Labeled label="Department">
              <DeptSelect value={formData.dep} onChange={(v) => setFormData({ ...formData, dep: v })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-3 gap-4">
            <Labeled label="Auditee">
              <input className={inputCls} value={formData.auditee} onChange={(e) => setFormData({ ...formData, auditee: e.target.value })} />
            </Labeled>
            <Labeled label="Due Date">
              <input type="date" className={inputCls} value={formData.dt} onChange={(e) => setFormData({ ...formData, dt: e.target.value })} required />
            </Labeled>
            <Labeled label="Follow-up Due Date">
              <input type="date" className={inputCls} value={formData.followUpDate} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset className="space-y-3">
            <Labeled label="Findings">
              <textarea className={inputCls} rows={3} value={formData.fnd} onChange={(e) => setFormData({ ...formData, fnd: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-3 gap-4">
            <Labeled label="NC Count">
              <input type="number" min={0} className={inputCls} value={formData.nc} onChange={(e) => setFormData({ ...formData, nc: parseInt(e.target.value, 10) || 0 })} />
            </Labeled>
            <Labeled label="Observation Count">
              <input type="number" min={0} className={inputCls} value={formData.obs} onChange={(e) => setFormData({ ...formData, obs: parseInt(e.target.value, 10) || 0 })} />
            </Labeled>
            <Labeled label="Report Ref">
              <input className={inputCls} value={formData.rpt} onChange={(e) => setFormData({ ...formData, rpt: e.target.value })} />
            </Labeled>
          </fieldset>

          <div>
            <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Link NCRs</label>
            <div className="max-h-40 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-surface-secondary">
              {ncrRecords.map((ncr) => {
                const isLinked = formData.ncrIds.includes(ncr.id);
                return (
                  <div
                    key={ncr.id}
                    onClick={() => toggleNcrLink(ncr.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${isLinked ? 'bg-accent-subtle border-accent border' : 'hover:bg-surface-hover border border-transparent'}`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isLinked ? 'text-accent' : 'text-text-primary'}`}>
                        {ncr.ref || 'Unnamed NCR'}
                      </span>
                      <span className="text-xs text-text-secondary truncate max-w-sm">{ncr.desc}</span>
                    </div>
                    {isLinked && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </div>
                );
              })}
              {ncrRecords.length === 0 && (
                <div className="p-2 text-sm text-text-tertiary">No NCRs available to link.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-surface-hover">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {initial ? 'Save Changes' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
