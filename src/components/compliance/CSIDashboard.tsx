import { useState, useMemo } from 'react';
import { useCSIStore } from '../../store/useCSIStore';
import type { CSIFollowUpStatus } from '../../store/useCSIStore';
import { CSI_QUESTIONS, calculateCSIScore, csiNeedsFollowUp } from '../../types';
import type { CSIRecord, CSIRating } from '../../types';
import { PTA_DEPARTMENTS } from '../../types';
import { Target, Search, Edit, Trash, Archive, Printer, AlertTriangle, Paperclip } from 'lucide-react';
import { useAuditStore } from '../../store/useAuditStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../shared/StatusBadge';
import { VARIANT_STYLES, resolveStatusVariant } from '../shared/statusBadgeUtils';
import { StateTransitionBar } from '../shared/StateTransitionBar';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { CommentThread } from '../shared/CommentThread';
import { normalizeScore } from '../../lib/csiScore';

const RATING_BUCKETS = ['All', 'Excellent', 'Good', 'Satisfactory', 'Fair', 'Needs Improvement'] as const;

const FOLLOWUP_STATUSES: CSIFollowUpStatus[] = ['Open', 'In Progress', 'Closed'];
const FOLLOWUP_LABELS: Record<CSIFollowUpStatus, string> = {
  Open: 'Open',
  'In Progress': 'In Progress',
  Closed: 'Closed',
};

function isFollowUpOverdue(record: CSIRecord): boolean {
  const fu = record.followUp;
  if (!fu || fu.status === 'Closed' || !fu.dueDate) return false;
  return new Date(fu.dueDate) < new Date(new Date().toDateString());
}

function ratingBucketMatches(record: CSIRecord, bucket: string): boolean {
  if (bucket === 'All') return true;
  const rating = record.rating as CSIRating | undefined;
  if (rating) return rating === bucket;
  // Legacy records with no stored rating: derive one from the normalized score.
  const s = normalizeScore(record.score);
  if (bucket === 'Excellent') return s >= 90;
  if (bucket === 'Good') return s >= 85 && s < 90;
  if (bucket === 'Satisfactory') return s >= 80 && s < 85;
  if (bucket === 'Fair') return s >= 75 && s < 80;
  return s < 75;
}

export function CSIDashboard() {
  const records = useCSIStore(s => s.records);
  const addRecord = useCSIStore(s => s.addRecord);
  const updateRecord = useCSIStore(s => s.updateRecord);
  const deleteRecord = useCSIStore(s => s.deleteRecord);
  const updateFollowUp = useCSIStore(s => s.updateFollowUp);
  const transitionFollowUp = useCSIStore(s => s.transitionFollowUp);
  const authUsers = useAuthStore(s => s.users);
  const { user } = useAuth();
  const canManageFollowUp = user?.role === 'admin' || user?.role === 'qa_manager';

  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterRating, setFilterRating] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CSIRecord | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const years = useMemo(() => {
    const yrs = new Set(records.map(r => String(r.yr || '')).filter(Boolean));
    return ['All', ...Array.from(yrs).sort().reverse()];
  }, [records]);

  const active = useMemo(() => {
    return records.filter(r => {
      if (!showArchived && r.isArchived) return false;
      if (filterYear !== 'All' && String(r.yr) !== filterYear) return false;
      if (!ratingBucketMatches(r, filterRating)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (r.cl?.toLowerCase() || '').includes(q) ||
          (r.proj?.toLowerCase() || '').includes(q) ||
          (r.suggestions?.toLowerCase() || '').includes(q) ||
          (r.obs?.toLowerCase() || '').includes(q)
        );
      }
      return true;
    });
  }, [records, filterYear, filterRating, search, showArchived]);

  const selected = records.find(r => r.id === selectedId);
  const avgScore = active.length ? Math.round(active.reduce((sum, r) => sum + normalizeScore(r.score), 0) / active.length) : 0;

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteRecord(id);
      useAuditStore.getState().log('delete', 'CSI', id, 'Deleted survey');
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleArchive = (id: string, isArchived: boolean) => {
    updateRecord(id, { isArchived: !isArchived });
    useAuditStore.getState().log('update', 'CSI', id, isArchived ? 'Unarchived survey' : 'Archived survey');
  };

  const isTargetMet = avgScore >= 85;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left panel */}
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary dark:text-white">CSI Surveys</h2>
          <button onClick={() => { setEditingRecord(null); setShowForm(true); }} className="bg-accent text-accent-fg px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm">+ New Survey</button>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm flex items-center gap-2 text-text-secondary"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/> Show Archived</label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className={`text-2xl font-bold ${isTargetMet ? 'text-success-text' : 'text-warning-text'}`}>{avgScore}%</div>
            <div className="text-xs text-text-tertiary mt-1">Avg CSI Score</div>
          </div>
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className="text-2xl font-bold text-accent-text">{active.length}</div>
            <div className="text-xs text-text-tertiary mt-1">Surveys Received</div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client/project/comments..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-20 text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-secondary">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-secondary">
          {RATING_BUCKETS.map(b => <option key={b} value={b}>{b === 'All' ? 'All Ratings' : b}</option>)}
        </select>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {active.map(r => {
            const score = normalizeScore(r.score);
            const overdue = isFollowUpOverdue(r);
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
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-text-primary text-sm truncate">{r.cl} {r.isArchived ? '(Archived)' : ''}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${VARIANT_STYLES[score >= 85 ? 'green' : 'amber']}`}>{score}%</span>
                </div>
                <div className="text-xs text-text-tertiary mt-1 truncate">{r.proj}</div>
                {r.followUp && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <StatusBadge
                      className="text-[10px] font-bold uppercase tracking-wide"
                      variant={resolveStatusVariant(r.followUp.status)}
                      status={`Follow-up: ${r.followUp.status}`}
                    />
                    {overdue && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${VARIANT_STYLES.red}`}>
                        <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Overall Satisfaction Distribution Card */}
        <div className="bg-surface rounded-xl border border-border p-5 shrink-0">
          <h3 className="text-base font-bold text-text-primary dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Overall Satisfaction Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Excellent (≥90%)</div>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                {active.filter(r => normalizeScore(r.score) >= 90).length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-center">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">Good (85-89%)</div>
              <div className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                {active.filter(r => { const s = normalizeScore(r.score); return s >= 85 && s < 90; }).length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Satisfactory (75-84%)</div>
              <div className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                {active.filter(r => { const s = normalizeScore(r.score); return s >= 75 && s < 85; }).length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-center">
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">Needs Action (&lt;75%)</div>
              <div className="text-xl font-bold text-rose-800 dark:text-rose-300 mt-1">
                {active.filter(r => normalizeScore(r.score) < 75).length}
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <div id="csi-print-area" className="bg-surface rounded-xl border border-border p-5 flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-1">{selected.cl}</h3>
                <p className="text-sm text-text-tertiary">{selected.proj}</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="p-2 bg-surface-tertiary hover:bg-surface-hover text-text-secondary rounded-full transition-colors" title="Print / Export"><Printer className="w-4 h-4"/></button>
                <button onClick={() => setShowEvidence(true)} title="Evidence" className="p-2 bg-surface-tertiary hover:bg-surface-hover text-text-secondary rounded-full transition-colors"><Paperclip className="w-4 h-4"/></button>
                <button onClick={() => { setEditingRecord(selected); setShowForm(true); }} className="p-2 bg-surface-tertiary hover:bg-surface-hover text-text-secondary rounded-full transition-colors"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleArchive(selected.id, !!selected.isArchived)} className="p-2 bg-surface-tertiary hover:bg-surface-hover text-warning-text rounded-full transition-colors"><Archive className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(selected.id)} className="p-2 bg-surface-tertiary hover:bg-surface-hover text-danger-text rounded-full transition-colors"><Trash className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Overall Score</div>
                <div className="text-xl font-bold mt-1 text-text-primary dark:text-white">{normalizeScore(selected.score)}%{typeof selected.totalScore === 'number' && <span className="text-xs text-text-tertiary font-normal ml-1">({selected.totalScore.toFixed(1)} raw)</span>}</div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium mb-1">Rating</div>
                <div className="flex items-center gap-1.5">
                  {selected.icon && <span className="text-base">{selected.icon}</span>}
                  <StatusBadge status={selected.rating} />
                </div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Date</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.dt || selected.yr}</div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Survey Status</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white capitalize">{(selected.status || 'closed').replace('_', ' ')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Project Code</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.projCode || '—'}</div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">PO Number</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.po || '—'}</div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Client Contact</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.clientName || '—'}</div>
              </div>
              <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
                <div className="text-xs text-text-tertiary font-medium">Client Designation</div>
                <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.clientDesig || '—'}</div>
              </div>
            </div>

            <div className="bg-surface-secondary p-3 rounded-lg border border-border-subtle">
              <div className="text-xs text-text-tertiary font-medium">Surveyed / Evaluated By</div>
              <div className="text-sm font-medium mt-1 text-text-primary dark:text-white">{selected.evaluatorName || '—'}</div>
            </div>

            {selected.scores && Object.keys(selected.scores).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Category Breakdown (FM-CSS-01, ISO Cl.9.1.2)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CSI_QUESTIONS.map(cat => {
                    const answered = cat.questions.filter(q => typeof selected.scores?.[q.code] === 'number');
                    if (answered.length === 0) return null;
                    const avg = answered.reduce((sum, q) => sum + (selected.scores?.[q.code] ?? 0), 0) / answered.length;
                    return (
                      <div key={cat.category} className="flex justify-between text-xs border-b border-border-subtle py-1.5">
                        <span className="text-text-secondary">{cat.category}</span>
                        <span className="font-semibold text-text-primary">{avg.toFixed(1)}/10</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selected.suggestions && (
              <div className="bg-accent-subtle rounded-lg p-4">
                <h4 className="text-sm font-semibold text-accent-text mb-2">Suggestions</h4>
                <p className="text-sm text-accent-text italic">"{selected.suggestions}"</p>
              </div>
            )}
            {selected.obs && (
              <div className="bg-surface-secondary rounded-lg p-4">
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Observations</h4>
                <p className="text-sm text-text-secondary">{selected.obs}</p>
              </div>
            )}
            {selected.comments && (
              <div className="bg-surface-secondary rounded-lg p-4">
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Internal QA Comments</h4>
                <p className="text-sm text-text-secondary">{selected.comments}</p>
              </div>
            )}

            {selected.followUp ? (
              <CSIFollowUpPanel
                record={selected}
                authUsers={authUsers}
                canManage={canManageFollowUp}
                currentUserName={user?.name || 'System'}
                onUpdate={(data) => updateFollowUp(selected.id, data)}
                onTransition={(to, reason, kind) => transitionFollowUp(selected.id, to, user?.name || 'System', reason, kind)}
              />
            ) : csiNeedsFollowUp(selected.rating) && (
              <div className="border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 bg-amber-50/40 dark:bg-amber-950/10 flex items-center justify-between gap-4">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>This survey rated <strong>{selected.rating}</strong> (below Satisfactory) but has no corrective action follow-up on record.</span>
                </div>
                {canManageFollowUp && (
                  <button
                    onClick={() => updateFollowUp(selected.id, {})}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                  >
                    Open Follow-up
                  </button>
                )}
              </div>
            )}

            <div className="print:hidden space-y-4 pt-2 border-t border-border-subtle">
              <CommentThread entityType="csi" entityId={selected.id} projectId={selected.id} />
            </div>
            {showEvidence && (
              <EvidencePanel entityType="csi" entityId={selected.id} projectId={selected.id} open={showEvidence} onClose={() => setShowEvidence(false)} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-text-tertiary bg-surface rounded-xl border border-border p-5">
            <Target className="w-12 h-12 mb-3 opacity-30 text-accent" />
            <p className="text-sm font-medium text-text-secondary">Select a survey from the list to inspect client feedback</p>
          </div>
        )}
      </div>

      {showForm && (
        <CSIFormModal
          record={editingRecord}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSubmit={(data) => {
            if (editingRecord) {
              updateRecord(editingRecord.id, data);
              useAuditStore.getState().log('update', 'CSI', editingRecord.id, 'Updated survey');
            } else {
              const newId = addRecord(data);
              useAuditStore.getState().log('create', 'CSI', newId.id, 'Created survey');
            }
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

function CSIFollowUpPanel({
  record,
  authUsers,
  canManage,
  currentUserName,
  onUpdate,
  onTransition,
}: {
  record: CSIRecord;
  authUsers: { id: string; displayName: string }[];
  canManage: boolean;
  currentUserName: string;
  onUpdate: (data: { owner?: string; assignedDept?: string; dueDate?: string; correctiveAction?: string }) => void;
  onTransition: (to: CSIFollowUpStatus, reason: string, kind: 'forward' | 'reject' | 'reopen' | 'verify') => void;
}) {
  const fu = record.followUp!;
  const overdue = isFollowUpOverdue(record);

  return (
    <div className="border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 bg-rose-50/40 dark:bg-rose-950/10 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Corrective Action Follow-up
        </h4>
        {overdue && (
          <StatusBadge className="uppercase tracking-wide" variant="red" status="Overdue" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Owner</label>
          <select
            className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary disabled:opacity-60"
            value={fu.owner || ''}
            disabled={!canManage}
            onChange={(e) => onUpdate({ owner: e.target.value })}
          >
            <option value="">— Select —</option>
            {authUsers.map(u => <option key={u.id} value={u.displayName}>{u.displayName}</option>)}
            {fu.owner && !authUsers.some(u => u.displayName === fu.owner) && <option value={fu.owner}>{fu.owner}</option>}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Assigned Dept</label>
          <select
            className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary disabled:opacity-60"
            value={fu.assignedDept || ''}
            disabled={!canManage}
            onChange={(e) => onUpdate({ assignedDept: e.target.value })}
          >
            <option value="">— Select —</option>
            {PTA_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Due Date</label>
          <input
            type="date"
            className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary disabled:opacity-60"
            value={fu.dueDate || ''}
            disabled={!canManage}
            onChange={(e) => onUpdate({ dueDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Corrective Action</label>
        <textarea
          rows={2}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary disabled:opacity-60"
          placeholder="Describe the corrective action taken to address the low rating…"
          value={fu.correctiveAction || ''}
          disabled={!canManage}
          onChange={(e) => onUpdate({ correctiveAction: e.target.value })}
        />
      </div>

      <StateTransitionBar
        statuses={FOLLOWUP_STATUSES}
        statusLabels={FOLLOWUP_LABELS}
        current={fu.status}
        history={fu.stateHistory}
        canAdvance={canManage}
        canVerifyClose={canManage}
        canReopen={canManage}
        onForward={(reason) => {
          const idx = FOLLOWUP_STATUSES.indexOf(fu.status);
          const next = FOLLOWUP_STATUSES[idx + 1];
          if (next) onTransition(next, reason, next === 'Closed' ? 'verify' : 'forward');
        }}
        onReject={(reason) => {
          const idx = FOLLOWUP_STATUSES.indexOf(fu.status);
          const prev = FOLLOWUP_STATUSES[idx - 1];
          if (prev) onTransition(prev, reason, 'reject');
        }}
        onReopen={(reason) => onTransition('In Progress', reason, 'reopen')}
      />
      {!canManage && (
        <p className="text-xs text-text-tertiary">Signed in as {currentUserName}. Only QA Manager / Admin can update this follow-up.</p>
      )}
    </div>
  );
}

function CSIFormModal({ record, onClose, onSubmit }: { record: CSIRecord | null, onClose: () => void, onSubmit: (data: Partial<CSIRecord>) => void }) {
  const authUsers = useAuthStore(s => s.users);
  const [formData, setFormData] = useState({
    cl: record?.cl || '', proj: record?.proj || '', yr: record?.yr || new Date().getFullYear(),
    dt: record?.dt || '', suggestions: record?.suggestions || '', obs: record?.obs || '',
    projCode: record?.projCode || '', po: record?.po || '', clientName: record?.clientName || '',
    clientDesig: record?.clientDesig || '', evaluatorName: record?.evaluatorName || '', comments: record?.comments || '',
  });
  const [scores, setScores] = useState<Record<string, number>>(record?.scores || {});
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = useMemo(() => CSI_QUESTIONS.reduce((sum, cat) => sum + cat.questions.length, 0), []);
  const answeredCount = Object.keys(scores).length;
  const preview = answeredCount > 0 ? calculateCSIScore(scores) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (answeredCount > 0 && answeredCount < totalQuestions) {
      setError(`Complete all ${totalQuestions} survey questions (${answeredCount} answered), or leave the survey blank to keep the existing score.`);
      return;
    }
    if (answeredCount === 0 && !record) {
      setError(`This is a new survey — please complete the ${totalQuestions}-question FM-CSS-01 instrument.`);
      return;
    }

    const payload: Partial<CSIRecord> = { ...formData };
    if (answeredCount > 0) {
      payload.scores = scores;
      // Let the store's calculateCSIScore derive score/rating/icon/totalScore from the answers.
      payload.score = undefined;
      payload.rating = undefined;
      payload.icon = undefined;
      payload.totalScore = undefined;
    }
    // Keep the canonical field names in sync with the legacy ones the rest of the app reads.
    payload.projectName = formData.proj;
    payload.surveyDate = formData.dt;

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface w-full max-w-3xl rounded-lg p-4 shadow-2xl border border-border text-text-primary max-h-[90vh] overflow-y-auto animate-modal-enter">
        <h3 className="text-xl font-bold mb-4 text-text-primary dark:text-white">{record ? 'Edit' : 'New'} Survey — FM-CSS-01 Rev 02 (ISO Cl.9.1.2)</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Client *</label>
              <input
                placeholder="e.g. SABIC / ARAMCO"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.cl}
                onChange={e => setFormData({...formData, cl: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Project *</label>
              <input
                placeholder="e.g. Turnaround Maintenance"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.proj}
                onChange={e => setFormData({...formData, proj: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.dt}
                onChange={e => setFormData({...formData, dt: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Year *</label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.yr}
                onChange={e => setFormData({...formData, yr: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Project Code</label>
              <input
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.projCode}
                onChange={e => setFormData({...formData, projCode: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">PO Number</label>
              <input
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.po}
                onChange={e => setFormData({...formData, po: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Client Contact Name</label>
              <input
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Client Designation</label>
              <input
                placeholder="e.g. Superintendent PP Maintenance"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.clientDesig}
                onChange={e => setFormData({...formData, clientDesig: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Surveyed / Evaluated By</label>
              <select
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                value={formData.evaluatorName}
                onChange={e => setFormData({...formData, evaluatorName: e.target.value})}
              >
                <option value="">— Select —</option>
                {authUsers.map(u => <option key={u.id} value={u.displayName}>{u.displayName}</option>)}
                {formData.evaluatorName && !authUsers.some(u => u.displayName === formData.evaluatorName) && <option value={formData.evaluatorName}>{formData.evaluatorName}</option>}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-text-primary dark:text-white">22-Question Survey Instrument</h4>
              <span className="text-xs text-text-tertiary">{answeredCount}/{totalQuestions} answered{preview ? ` — ${preview.totalScore}% (${preview.rating})` : ''}</span>
            </div>
            {record && !record.scores && (
              <p className="text-xs text-warning-text dark:text-amber-400 mb-2">This is a legacy record with a manually recorded score. Leave every question blank to keep it unchanged, or complete all {totalQuestions} to replace it with a derived score.</p>
            )}
            <div className="space-y-3 max-h-64 overflow-y-auto border border-border rounded-lg p-3">
              {CSI_QUESTIONS.map(cat => (
                <div key={cat.category}>
                  <div className="text-xs font-semibold text-text-secondary mb-1">{cat.category}</div>
                  {cat.questions.map(q => (
                    <div key={q.code} className="flex items-center gap-2 py-1">
                      <span className="text-xs text-text-tertiary flex-1">{q.question}</span>
                      <select
                        className="w-16 text-sm border border-border rounded-md px-1 py-1 bg-surface text-text-primary"
                        value={scores[q.code] ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setScores(prev => {
                            const next = { ...prev };
                            if (val === '') delete next[q.code];
                            else next[q.code] = Number(val);
                            return next;
                          });
                        }}
                      >
                        <option value="">—</option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Suggestions & Recommendations</label>
              <textarea
                placeholder="Client comments and suggestions..."
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                rows={2}
                value={formData.suggestions}
                onChange={e => setFormData({...formData, suggestions: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Observations</label>
              <textarea
                placeholder="Internal audit observations..."
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                rows={2}
                value={formData.obs}
                onChange={e => setFormData({...formData, obs: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Internal QA Comments</label>
              <textarea
                placeholder="Internal QA notes (not shown to client)..."
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                rows={2}
                value={formData.comments}
                onChange={e => setFormData({...formData, comments: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-accent text-accent-fg rounded-lg hover:bg-accent-hover shadow-sm transition-colors">Submit Survey</button>
          </div>
        </form>
      </div>
    </div>
  );
}
