import { useState, useMemo } from 'react';
import { Target, Plus, Search, Clock, FileCheck, AlertCircle, User as UserIcon, Paperclip, MessageSquare, Printer, CheckCircle2 } from 'lucide-react';
import { useTUVStore, getTUVDaysRemaining, isTUVOverdue } from '../../store/useTUVStore';
import type { TUVRecord, TUVRecordStatus } from '../../store/useTUVStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../shared/StatusBadge';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';

const DEPTS = ['IED / QAQC', 'Projects', 'OSD', 'IT', 'Facility', 'Procurement', 'Store', 'P&E', 'HR'];

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-colors';

function DeptSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
      {value && !DEPTS.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

function UserSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const authUsers = useAuthStore((s) => s.users);
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Unassigned —</option>
      {authUsers.map((u) => (
        <option key={u.id} value={u.displayName}>{u.displayName}</option>
      ))}
      {value && !authUsers.some((u) => u.displayName === value) && <option value={value}>{value}</option>}
    </select>
  );
}

type Stage = 'open' | 'actiontaken' | 'verified' | 'closed';

function stageOf(status: TUVRecordStatus): Stage {
  if (status === 'Closed') return 'closed';
  if (status === 'Verified') return 'verified';
  if (status === 'Action Taken' || status === 'In Progress') return 'actiontaken';
  return 'open';
}

export function TUVTracker() {
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const records = useTUVStore((s) => s.records);
  const addRecord = useTUVStore((s) => s.addRecord);
  const updateRecord = useTUVStore((s) => s.updateRecord);
  const transitionStatus = useTUVStore((s) => s.transitionStatus);
  const toggleArchive = useTUVStore((s) => s.toggleArchive);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TUVRecordStatus>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'due'>('default');

  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TUVRecord | null>(null);

  const nonArchived = useMemo(() => records.filter((r) => showArchived || !r.isArchived), [records, showArchived]);
  const overdueCount = useMemo(() => nonArchived.filter(isTUVOverdue).length, [nonArchived]);

  const availableDepts = useMemo(() => {
    const extra = records.map((r) => r.assignedDept || '').filter((d) => d && !DEPTS.includes(d));
    return [...DEPTS, ...Array.from(new Set(extra))];
  }, [records]);

  const availableOwners = useMemo(
    () => Array.from(new Set(records.map((r) => r.owner).filter((o): o is string => !!o))),
    [records]
  );

  const filtered = useMemo(() => {
    let list = nonArchived;
    if (statusFilter !== 'All') list = list.filter((r) => r.status === statusFilter);
    if (deptFilter !== 'All') list = list.filter((r) => r.assignedDept === deptFilter);
    if (ownerFilter !== 'All') list = list.filter((r) => r.owner === ownerFilter);
    if (overdueOnly) list = list.filter(isTUVOverdue);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.num || '').toLowerCase().includes(q) ||
        (r.desc || '').toLowerCase().includes(q) ||
        (r.owner || '').toLowerCase().includes(q) ||
        (r.cl || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'due') {
        const da = a.due ? new Date(a.due).getTime() : Infinity;
        const db = b.due ? new Date(b.due).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });
  }, [nonArchived, statusFilter, deptFilter, ownerFilter, overdueOnly, search, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">TÜV Tracker</h2>
          <p className="text-sm text-text-secondary mt-1">Track TÜV recommendations and closures</p>
        </div>
        <button
          onClick={() => { setSelectedRecord(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Recommendation
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{nonArchived.length}</div>
          <div className="text-xs text-text-tertiary mt-1">Total Recommendations</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{nonArchived.filter((r) => r.status === 'Closed').length}</div>
          <div className="text-xs text-text-tertiary mt-1">Closed</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-sky-600">{nonArchived.filter((r) => stageOf(r.status) === 'actiontaken').length}</div>
          <div className="text-xs text-text-tertiary mt-1">Action Taken</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className={'text-2xl font-bold ' + (overdueCount > 0 ? 'text-danger' : 'text-text-tertiary')}>{overdueCount}</div>
          <div className="text-xs text-text-tertiary mt-1">Overdue</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recommendations..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Action Taken">Action Taken</option>
          <option value="Verified">Verified</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Departments</option>
          {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Owners</option>
          {availableOwners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="default">Default order</option>
          <option value="due">Due date soonest</option>
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

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-secondary text-xs text-text-tertiary uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4 font-semibold">Ref & Clause</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Owner / Dept</th>
                <th className="px-6 py-4 font-semibold">Status & Countdown</th>
                <th className="px-6 py-4 font-semibold">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((record) => {
                const daysLeft = getTUVDaysRemaining(record.due);
                const overdue = isTUVOverdue(record);

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => { setSelectedRecord(record); setShowForm(true); }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-accent" />
                        <span className="font-medium text-text-primary">{record.num}</span>
                      </div>
                      <div className="text-sm text-text-secondary mt-1">Cl. {record.cl}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-text-primary line-clamp-3">{record.desc}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-primary">{record.owner}</div>
                      {record.assignedDept && <div className="text-xs text-text-tertiary mt-0.5">{record.assignedDept}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 mb-2">
                        {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
                        <StatusBadge status={record.status} />
                      </div>
                      {record.status !== 'Closed' && record.due && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md inline-flex ${overdue ? 'bg-red-500/10 text-red-500' :
                          daysLeft !== null && daysLeft <= 30 ? 'bg-amber-500/10 text-amber-500' :
                          'bg-surface-secondary text-text-secondary'}`}>
                          <Clock className="w-3 h-3" />
                          {overdue ? `${Math.abs(daysLeft!)} days overdue` : `${daysLeft} days left`}
                        </div>
                      )}
                      {record.status === 'Closed' && record.closed && (
                        <div className="text-xs text-emerald-500/80 mt-1">Closed: {record.closed}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {record.evidence ? (
                        <div className="flex items-start gap-2 text-sm text-text-secondary">
                          <FileCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{record.evidence}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-text-tertiary">
                          <AlertCircle className="w-4 h-4" />
                          <span>No evidence linked</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-tertiary">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No recommendations found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (() => {
        const liveRecord = selectedRecord ? records.find((r) => r.id === selectedRecord.id) ?? null : null;
        return (
          <TUVModal
            record={liveRecord}
            isMR={isMR}
            onClose={() => { setShowForm(false); setSelectedRecord(null); }}
            onCreate={(data) => { addRecord({ ...data, status: 'Open' }); setShowForm(false); setSelectedRecord(null); }}
            onUpdate={(data) => liveRecord && updateRecord(liveRecord.id, data)}
            onTransition={(to, reason, kind) => liveRecord && transitionStatus(liveRecord.id, to, user?.name || 'System', reason, kind)}
            onToggleArchive={() => liveRecord && toggleArchive(liveRecord.id)}
          />
        );
      })()}
    </div>
  );
}

function TUVModal({
  record,
  isMR,
  onClose,
  onCreate,
  onUpdate,
  onTransition,
  onToggleArchive,
}: {
  record: TUVRecord | null;
  isMR: boolean;
  onClose: () => void;
  onCreate: (data: Omit<TUVRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onUpdate: (data: Partial<TUVRecord>) => void;
  onTransition: (to: TUVRecordStatus, reason: string, kind: 'forward' | 'reject' | 'reopen' | 'verify') => void;
  onToggleArchive: () => void;
}) {
  const [formData, setFormData] = useState({
    num: record?.num || '',
    cl: record?.cl || '',
    desc: record?.desc || '',
    owner: record?.owner || '',
    assignedDept: record?.assignedDept || '',
    due: record?.due || '',
    evidence: record?.evidence || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [gate, setGate] = useState<null | { to: TUVRecordStatus; kind: 'reject' | 'reopen' | 'verify'; label: string }>(null);
  const [gateReason, setGateReason] = useState('');

  const overdue = record ? isTUVOverdue(record) : false;
  const stage = record ? stageOf(record.status) : 'open';

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.num.trim()) errs.num = 'Ref number is required.';
    if (!formData.desc.trim()) errs.desc = 'Description is required.';
    if (!formData.owner.trim()) errs.owner = 'Owner is required.';
    if (!formData.due.trim()) errs.due = 'Due date is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (record) {
      onUpdate(formData);
    } else {
      onCreate(formData as any);
    }
    onClose();
  };

  function confirmGate() {
    if (!gate || !gateReason.trim()) return;
    onTransition(gate.to, gateReason.trim(), gate.kind);
    setGate(null);
    setGateReason('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto animate-modal-enter">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">{record ? 'Edit Recommendation' : 'Add Recommendation'}</h3>
          {record && (
            <div className="flex items-center gap-1.5">
              {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
              <StatusBadge status={record.status} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ref Number *</label>
            <input className={inputCls} value={formData.num} onChange={(e) => setFormData({ ...formData, num: e.target.value })} />
            {formErrors.num && <p className="text-xs text-danger mt-1">{formErrors.num}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Clause</label>
            <input className={inputCls} value={formData.cl} onChange={(e) => setFormData({ ...formData, cl: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Description *</label>
            <textarea rows={3} className={inputCls} value={formData.desc} onChange={(e) => setFormData({ ...formData, desc: e.target.value })} />
            {formErrors.desc && <p className="text-xs text-danger mt-1">{formErrors.desc}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> Owner *
            </label>
            <UserSelect value={formData.owner} onChange={(v) => setFormData({ ...formData, owner: v })} />
            {formErrors.owner && <p className="text-xs text-danger mt-1">{formErrors.owner}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Assigned Department</label>
            <DeptSelect value={formData.assignedDept} onChange={(v) => setFormData({ ...formData, assignedDept: v })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Due Date *
            </label>
            <input type="date" className={inputCls} value={formData.due} onChange={(e) => setFormData({ ...formData, due: e.target.value })} />
            {formErrors.due && <p className="text-xs text-danger mt-1">{formErrors.due}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Evidence Linking</label>
            <textarea rows={3} placeholder="Enter evidence details or links..." className={inputCls} value={formData.evidence} onChange={(e) => setFormData({ ...formData, evidence: e.target.value })} />
          </div>
        </div>

        {record && (
          <div className="border-t border-border pt-4 mb-4 space-y-3">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">State Machine</label>
            <div className="flex gap-2 flex-wrap items-center">
              {stage === 'open' && (
                <button onClick={() => onTransition('Action Taken', 'Action taken via quick action', 'forward')}
                  className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors">
                  Record Action Taken →
                </button>
              )}
              {stage === 'actiontaken' && isMR && (
                <>
                  <button onClick={() => setGate({ to: 'Verified', kind: 'verify', label: 'Verify Effectiveness' })}
                    className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />Verify Effectiveness
                  </button>
                  <button onClick={() => setGate({ to: 'Open', kind: 'reject', label: 'Return to Open' })}
                    className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                    ↩ Return to Open
                  </button>
                </>
              )}
              {stage === 'verified' && isMR && (
                <button onClick={() => onTransition('Closed', 'Closed after verification', 'forward')}
                  className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors">
                  Close Recommendation →
                </button>
              )}
              {stage === 'closed' && isMR && (
                <button onClick={() => setGate({ to: 'Action Taken', kind: 'reopen', label: 'Reopen' })}
                  className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                  Reopen
                </button>
              )}
            </div>

            {gate && (
              <div className="p-3 bg-surface-secondary rounded-lg border border-border space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Reason for {gate.label.toLowerCase()} (required)
                </label>
                <textarea autoFocus rows={2} value={gateReason} onChange={(e) => setGateReason(e.target.value)} placeholder="Explain the decision…" className={inputCls} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setGate(null); setGateReason(''); }} className="px-3 py-1.5 text-xs text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={confirmGate} disabled={!gateReason.trim()} className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">Confirm</button>
                </div>
              </div>
            )}

            {(record.approvedBy || record.rejectedBy || record.reviewedBy) && (
              <div className="text-[11px] bg-surface-secondary border border-border rounded-lg p-2.5 space-y-1">
                {record.approvedBy && <div><span className="font-semibold text-text-primary">Verified</span> by {record.approvedBy} on {record.approvalDate && new Date(record.approvalDate).toLocaleString()}: {record.approvalComments}</div>}
                {record.reviewedBy && <div><span className="font-semibold text-text-primary">Returned</span> by {record.reviewedBy} on {record.reviewDate && new Date(record.reviewDate).toLocaleString()}: {record.reviewComments}</div>}
              </div>
            )}

            {record.stateHistory && record.stateHistory.length > 0 && (
              <div className="space-y-1">
                {[...record.stateHistory].reverse().map((h, i) => (
                  <div key={i} className="text-[11px] bg-surface-secondary border border-border rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold text-text-primary">{h.from} → {h.to}</span>
                    <span className="ml-2 text-text-tertiary">by {h.by}: {h.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {record && (
          <div className="border-t border-border pt-4 mb-4">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Action Plan</label>
            <div className="p-3 bg-surface-secondary rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Action Taken</label>
                <textarea rows={2} value={record.actionTaken ?? ''} onChange={(e) => onUpdate({ actionTaken: e.target.value })} placeholder="Describe the action taken…" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Action Taken Date</label>
                <input type="date" className={inputCls} value={record.actionTakenDate ?? ''} onChange={(e) => onUpdate({ actionTakenDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Verified By</label>
                <div className="text-sm text-text-primary px-3 py-2">{record.verifiedBy || '—'}{record.verifiedDate ? ` on ${new Date(record.verifiedDate).toLocaleDateString()}` : ''}</div>
              </div>
            </div>
          </div>
        )}

        {record && (
          <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
            <button onClick={() => setShowEvidence(true)} title="Evidence" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={() => setShowComments((v) => !v)} title="Comments" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <MessageSquare className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} title="Print / Export" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onToggleArchive} className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1.5 ml-auto">
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        )}

        {record && showComments && (
          <div className="mb-4">
            <CommentThread entityType="tuv" entityId={record.id} projectId={record.id} />
          </div>
        )}

        {record && showEvidence && (
          <EvidencePanel entityType="tuv" entityId={record.id} projectId={record.id} open={showEvidence} onClose={() => setShowEvidence(false)} />
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover text-text-primary transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover shadow-sm transition-colors">Save Recommendation</button>
        </div>
      </div>
    </div>
  );
}
