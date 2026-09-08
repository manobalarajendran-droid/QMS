import { useMemo, useState, type ReactNode } from 'react';
import { useCalibStore, computeCalibStatus, isCalibOverdue } from '../../store/useCalibStore';
import type { CalibRecord, CalibStatus } from '../../store/useCalibStore';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { PTA_DEPARTMENTS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';
import {
  Settings,
  Plus,
  AlertTriangle,
  X,
  Paperclip,
  MessageSquare,
  Printer,
  Search,
  User as UserIcon,
} from 'lucide-react';

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

const IN_SERVICE: CalibStatus[] = ['Valid', 'Due', 'Overdue', 'Active', 'Due Soon'];

export function CalibrationRegister() {
  const records = useCalibStore((s) => s.records);
  const addRecord = useCalibStore((s) => s.addRecord);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'InService' | 'Out of Service' | 'Scrapped'>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'nextCalib' | 'newest' | 'oldest'>('nextCalib');

  const displayRecords = useMemo(
    () => records.map((r) => ({ ...r, status: computeCalibStatus(r) })),
    [records]
  );

  const selected = displayRecords.find((r) => r.id === selectedId) || null;

  const overdueCount = displayRecords.filter((r) => r.status === 'Overdue').length;
  const dueSoonCount = displayRecords.filter((r) => r.status === 'Due').length;

  const filteredRecords = useMemo(() => {
    let list = displayRecords.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter === 'InService') {
      list = list.filter((r) => IN_SERVICE.includes(r.status));
    } else if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (deptFilter !== 'All') {
      list = list.filter((r) => r.assignedDept === deptFilter);
    }
    if (overdueOnly) {
      list = list.filter(isCalibOverdue);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.equipNo.toLowerCase().includes(q) || r.equipName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      const da = a.nextCalibDate ? new Date(a.nextCalibDate).getTime() : Infinity;
      const db = b.nextCalibDate ? new Date(b.nextCalibDate).getTime() : Infinity;
      return da - db;
    });
  }, [displayRecords, showArchived, statusFilter, deptFilter, overdueOnly, search, sortBy]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left List */}
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-danger' : 'text-text-tertiary'}`}>{overdueCount}</div>
            <div className="text-xs text-text-tertiary">Overdue</div>
          </div>
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className={`text-2xl font-bold ${dueSoonCount > 0 ? 'text-warning' : 'text-text-tertiary'}`}>{dueSoonCount}</div>
            <div className="text-xs text-text-tertiary">Due {'<'} 30 days</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" /> Equipment Register
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs bg-accent text-white px-2 py-1 rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Statuses</option>
            <option value="InService">In Service</option>
            <option value="Out of Service">Out of Service</option>
            <option value="Scrapped">Scrapped</option>
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="All">All Departments</option>
            {PTA_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
            <option value="nextCalib">Next due soonest</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
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
            const overdue = isCalibOverdue(r);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === r.id ? 'border-accent bg-accent-subtle' : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-text-primary text-sm truncate">{r.equipNo}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-text-tertiary mt-1 truncate">{r.equipName}</div>
                {overdue && (
                  <div className="text-[10px] mt-1.5 flex items-center gap-1 text-danger">
                    <AlertTriangle className="w-3 h-3" /> Due: {r.nextCalibDate}
                  </div>
                )}
                {(r.assignedTo || r.assignedDept) && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1.5 pt-1.5 border-t border-border">
                    {r.assignedTo && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {r.assignedTo}</span>}
                    {r.assignedDept && <span className="bg-surface-hover px-1.5 py-0.5 rounded border border-border">{r.assignedDept}</span>}
                  </div>
                )}
              </button>
            );
          })}
          {filteredRecords.length === 0 && <p className="text-xs text-center text-text-tertiary py-8">No equipment found.</p>}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <CalibDetailPanel record={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary bg-surface rounded-xl border border-border">
            <Settings className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select equipment to view calibration details</p>
          </div>
        )}
      </div>

      {showForm && (
        <CalibrationFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            addRecord({ ...data, status: 'Valid' });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function CalibDetailPanel({ record, onClose }: { record: CalibRecord; onClose: () => void }) {
  const { user } = useAuth();
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';

  const updateRecord = useCalibStore((s) => s.updateRecord);
  const deleteRecord = useCalibStore((s) => s.deleteRecord);
  const toggleArchive = useCalibStore((s) => s.toggleArchive);
  const reportOutOfTolerance = useCalibStore((s) => s.reportOutOfTolerance);
  const verifyReturnToService = useCalibStore((s) => s.verifyReturnToService);
  const scrapInstrument = useCalibStore((s) => s.scrapInstrument);
  const reopenFromScrap = useCalibStore((s) => s.reopenFromScrap);

  const [showEdit, setShowEdit] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [oosAction, setOosAction] = useState<'verify' | 'scrap' | null>(null);
  const [oosReason, setOosReason] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const projectId = record.id;
  const overdue = isCalibOverdue(record);
  const inService = IN_SERVICE.includes(record.status);

  function submitOosGate() {
    if (!oosAction || !oosReason.trim()) return;
    if (oosAction === 'verify') verifyReturnToService(record.id, user?.name || 'System', oosReason.trim());
    else scrapInstrument(record.id, user?.name || 'System', oosReason.trim());
    setOosAction(null);
    setOosReason('');
  }

  return (
    <div className="space-y-4 print:space-y-4">
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-text-primary">{record.equipNo}</h2>
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
                if (window.confirm('Delete this equipment record?')) {
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
        <div className="text-sm text-text-tertiary mb-4">{record.equipName}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Assigned To" value={record.assignedTo} />
          <InfoField label="Assigned Dept" value={record.assignedDept} />
          <InfoField label="Location" value={record.location} />
          <InfoField label="Next Calibration" value={record.nextCalibDate} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Equipment Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Manufacturer" value={record.manufacturer} />
          <InfoField label="Serial No" value={record.serialNo} />
          <InfoField label="Frequency (Months)" value={String(record.freqMonths)} />
          <InfoField label="Last Calibrated" value={record.lastCalibDate} />
          <InfoField label="Certificate No" value={record.certificateNo} />
          <InfoField label="Calibration Agency" value={record.calibrationAgency} />
          <InfoField label="Calibrated By" value={record.calibratedBy} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-secondary p-4 rounded-xl border border-border">{record.notes || '—'}</p>
        </div>
      </div>

      {(record.status === 'Out of Service' || record.status === 'Scrapped' || record.correctiveAction || record.correctiveOwner) && (
        <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Corrective Action</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Corrective Action">
              <textarea
                className={inputCls}
                rows={2}
                value={record.correctiveAction ?? ''}
                onChange={(e) => updateRecord(record.id, { correctiveAction: e.target.value })}
                placeholder="Describe the corrective action taken…"
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
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Disposition Trail</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {record.approvedBy && <InfoField label="Returned to Service By" value={`${record.approvedBy}${record.approvalDate ? ` (${record.approvalDate})` : ''}`} />}
            {record.approvalComments && <InfoField label="Verification Comments" value={record.approvalComments} />}
            {record.rejectedBy && <InfoField label="Scrapped By" value={`${record.rejectedBy}${record.rejectionDate ? ` (${record.rejectionDate})` : ''}`} />}
            {record.rejectionReason && <InfoField label="Scrap Reason" value={record.rejectionReason} />}
          </div>
        </div>
      )}

      {inService && (
        <div className="bg-surface-secondary p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Instrument Status</h3>
          {showReportBox ? (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Reason for reporting out-of-tolerance / out of service (required)
              </label>
              <textarea
                autoFocus
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the out-of-tolerance finding…"
                className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowReportBox(false); setReportReason(''); }} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    reportOutOfTolerance(record.id, user?.name || 'System', reportReason.trim());
                    setShowReportBox(false);
                    setReportReason('');
                  }}
                  disabled={!reportReason.trim()}
                  className="px-3 py-1.5 text-sm text-white bg-danger rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReportBox(true)}
              className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
            >
              Report Out-of-Tolerance
            </button>
          )}
        </div>
      )}

      {record.status === 'Out of Service' && (
        <div className="bg-surface-secondary p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Disposition Gate</h3>
          {isMR ? (
            oosAction ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Reason for {oosAction === 'verify' ? 'returning the instrument to service' : 'scrapping the instrument'} (required)
                </label>
                <textarea
                  autoFocus
                  rows={2}
                  value={oosReason}
                  onChange={(e) => setOosReason(e.target.value)}
                  placeholder="Explain the disposition decision…"
                  className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setOosAction(null); setOosReason(''); }} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={submitOosGate}
                    disabled={!oosReason.trim()}
                    className="px-3 py-1.5 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setOosAction('verify')}
                  className="bg-success text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Verify &amp; Return to Service
                </button>
                <button
                  onClick={() => setOosAction('scrap')}
                  className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Scrap Instrument
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-text-tertiary">Only QA Manager / Admin can verify return-to-service or scrap this instrument.</p>
          )}
        </div>
      )}

      {record.status === 'Scrapped' && (
        <div className="bg-danger-subtle p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold text-danger mb-2">Instrument Scrapped</h3>
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
                  reopenFromScrap(record.id, user?.name || 'System', reopenReason.trim());
                  setReopenReason('');
                }}
                className="bg-accent text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                Reopen (Return to Out of Service)
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Only QA Manager / Admin can reopen a scrapped record.</p>
          )}
        </div>
      )}

      {record.stateHistory && record.stateHistory.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Transition History</h3>
          <div className="space-y-2">
            {[...record.stateHistory].reverse().map((h, i) => (
              <div key={i} className="text-xs bg-surface-secondary border border-border rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">
                    {h.from} → {h.to}
                    <span className="ml-2 text-[10px] uppercase font-bold text-accent">{h.kind}</span>
                  </span>
                  <span className="text-text-tertiary">{new Date(h.at).toLocaleString()}</span>
                </div>
                <div className="text-text-secondary mt-1">By {h.by}: {h.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showComments && (
        <section className="bg-surface rounded-xl border border-border p-6 print:hidden">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">Comments</h3>
          <CommentThread entityType="calibration" entityId={record.id} projectId={projectId} />
        </section>
      )}

      {showEvidence && (
        <EvidencePanel entityType="calibration" entityId={record.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}

      {showEdit && (
        <CalibrationFormModal
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

interface CalibFormData {
  equipNo: string;
  equipName: string;
  manufacturer: string;
  serialNo: string;
  location: string;
  freqMonths: number;
  lastCalibDate: string;
  nextCalibDate: string;
  certificateNo: string;
  calibrationAgency: string;
  calibratedBy: string;
  notes: string;
  assignedTo: string;
  assignedDept: string;
}

function CalibrationFormModal({
  onClose,
  onSubmit,
  initial,
}: {
  onClose: () => void;
  onSubmit: (data: CalibFormData) => void;
  initial?: CalibRecord;
}) {
  const [formData, setFormData] = useState<CalibFormData>({
    equipNo: initial?.equipNo ?? '',
    equipName: initial?.equipName ?? '',
    manufacturer: initial?.manufacturer ?? '',
    serialNo: initial?.serialNo ?? '',
    location: initial?.location ?? '',
    freqMonths: initial?.freqMonths ?? 12,
    lastCalibDate: initial?.lastCalibDate ?? new Date().toISOString().split('T')[0],
    nextCalibDate: initial?.nextCalibDate ?? new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    certificateNo: initial?.certificateNo ?? '',
    calibrationAgency: initial?.calibrationAgency ?? '',
    calibratedBy: initial?.calibratedBy ?? '',
    notes: initial?.notes ?? '',
    assignedTo: initial?.assignedTo ?? '',
    assignedDept: initial?.assignedDept ?? '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-2xl rounded-xl p-6 shadow-2xl border border-border my-8">
        <h3 className="text-xl font-bold mb-4 text-text-primary">{initial ? 'Edit Equipment' : 'Add Equipment'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}
          className="space-y-6"
        >
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Equipment No *">
              <input className={inputCls} placeholder="e.g. CAL-042" value={formData.equipNo} onChange={(e) => setFormData({ ...formData, equipNo: e.target.value })} required />
            </Labeled>
            <Labeled label="Equipment Name *">
              <input className={inputCls} placeholder="e.g. Digital Caliper" value={formData.equipName} onChange={(e) => setFormData({ ...formData, equipName: e.target.value })} required />
            </Labeled>
            <Labeled label="Manufacturer">
              <input className={inputCls} placeholder="e.g. Mitutoyo" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
            </Labeled>
            <Labeled label="Serial No">
              <input className={inputCls} placeholder="e.g. SN-981240" value={formData.serialNo} onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })} />
            </Labeled>
            <Labeled label="Location">
              <input className={inputCls} placeholder="e.g. QA Lab A" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </Labeled>
            <Labeled label="Frequency (Months)">
              <input type="number" className={inputCls} value={formData.freqMonths} onChange={(e) => setFormData({ ...formData, freqMonths: Number(e.target.value) })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Assigned To (Owner)">
              <UserSelect value={formData.assignedTo} onChange={(v) => setFormData({ ...formData, assignedTo: v })} />
            </Labeled>
            <Labeled label="Assigned Department">
              <DeptSelect value={formData.assignedDept} onChange={(v) => setFormData({ ...formData, assignedDept: v })} />
            </Labeled>
          </fieldset>

          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Labeled label="Last Calibration Date">
              <input type="date" className={inputCls} value={formData.lastCalibDate} onChange={(e) => setFormData({ ...formData, lastCalibDate: e.target.value })} />
            </Labeled>
            <Labeled label="Next Calibration Date">
              <input type="date" className={inputCls} value={formData.nextCalibDate} onChange={(e) => setFormData({ ...formData, nextCalibDate: e.target.value })} />
            </Labeled>
            <Labeled label="Certificate No">
              <input className={inputCls} placeholder="Enter certificate number…" value={formData.certificateNo} onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })} />
            </Labeled>
            <Labeled label="Calibration Agency">
              <input className={inputCls} placeholder="e.g. Saudi Standards Metrology (SASO)" value={formData.calibrationAgency} onChange={(e) => setFormData({ ...formData, calibrationAgency: e.target.value })} />
            </Labeled>
            <Labeled label="Calibrated By">
              <input className={inputCls} placeholder="e.g. Eng. Mansoor" value={formData.calibratedBy} onChange={(e) => setFormData({ ...formData, calibratedBy: e.target.value })} />
            </Labeled>
          </fieldset>

          <fieldset>
            <Labeled label="Notes">
              <textarea className={inputCls} rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </Labeled>
          </fieldset>

          <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg shadow-sm transition-colors">
              {initial ? 'Save Changes' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
