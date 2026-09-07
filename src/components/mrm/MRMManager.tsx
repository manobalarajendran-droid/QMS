import { useState, useMemo } from 'react';
import { useMRMStore } from '../../store/useMRMStore';
import { useNCRStore } from '../../store/useNCRStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { useClientIntakeStore } from '../../store/useClientIntakeStore';
import { useAuth } from '../../hooks/useAuth';
import type { MRMActionItem, MRMStatus } from '../../store/useMRMStore';
import {
  Landmark, Plus, ChevronDown, ChevronRight, Archive,
  AlertTriangle, CheckCircle2, Clock, Users, FileText,
  ClipboardList, Flag
} from 'lucide-react';

import { StatusBadge } from '../shared/StatusBadge';

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

export function MRMManager() {
  const { user } = useAuth();
  const records = useMRMStore((s) => s.records);
  const addRecord = useMRMStore((s) => s.addRecord);
  const updateRecord = useMRMStore((s) => s.updateRecord);
  const updateStatus = useMRMStore((s) => s.updateStatus);
  const reviewMinutes = useMRMStore((s) => s.reviewMinutes);
  const approveMinutes = useMRMStore((s) => s.approveMinutes);
  const archiveRecord = useMRMStore((s) => s.archiveRecord);
  const addActionItem = useMRMStore((s) => s.addActionItem);
  const updateActionItem = useMRMStore((s) => s.updateActionItem);
  const ncrRecords = useNCRStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const intakeRecords = useClientIntakeStore((s) => s.records);

  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showNewModal, setShowNewModal] = useState(false);

  const activeRecords = useMemo(
    () => records.filter((r) => showArchived || !r.isArchived),
    [records, showArchived]
  );

  const selected = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId]);

  const openNCRCount = ncrRecords.filter((r) => r.status !== 'Closed').length;
  const openActionsCount = records.flatMap((r) => r.actionItems).filter((a) => a.status !== 'Closed').length;

  const preRead = useMemo(() => generatePreReadPack(objectives, intakeRecords), [objectives, intakeRecords]);

  const toggleSection = (id: string) =>
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleCreateMeeting = (formData: {
    meetingNo: string;
    meetingDate: string;
    chairperson: string;
    attendees: string[];
    venue: string;
    agendaItems: string[];
  }) => {
    const { objectiveMisses, slaBreaches } = generatePreReadPack(objectives, intakeRecords);
    addRecord({
      meetingDate: formData.meetingDate,
      meetingNo: formData.meetingNo,
      chairperson: formData.chairperson,
      attendees: formData.attendees,
      venue: formData.venue,
      status: 'Scheduled',
      agendaItems: formData.agendaItems,
      inputs: {
        customerFeedback: false, objectivesReview: false, processPerformance: false,
        ncrsAndCAPAs: false, auditFindings: false, supplierPerformance: false,
        resourceAdequacy: false, riskOpportunities: false,
      },
      minutesSummary: '',
      decisions: '',
      actionItems: [],
      flaggedObjectiveMisses: objectiveMisses,
      flaggedSLABreaches: slaBreaches,
    });
    setShowNewModal(false);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left panel */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{openNCRCount}</div>
            <div className="text-xs text-slate-500">Open NCRs</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{openActionsCount}</div>
            <div className="text-xs text-slate-500">Open Actions</div>
          </div>
        </div>

        {/* Pre-read alerts */}
        {(preRead.objectiveMisses.length > 0 || preRead.slaBreaches.length > 0) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
              <Flag className="w-3 h-3" /> Auto-flagged for next MRM
            </div>
            {preRead.objectiveMisses.map((m, i) => (
              <div key={i} className="text-xs text-red-600 dark:text-red-400 mb-1">⚠ {m}</div>
            ))}
            {preRead.slaBreaches.map((b, i) => (
              <div key={i} className="text-xs text-red-600 dark:text-red-400 mb-1">🚨 {b}</div>
            ))}
          </div>
        )}

        {/* Header + new button */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-500" /> MRM Meetings
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${showArchived ? 'bg-slate-100 dark:bg-slate-700 border-slate-300' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {activeRecords.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === r.id
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              } ${r.isArchived ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white">{r.meetingNo}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.meetingDate}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {(r.flaggedObjectiveMisses.length > 0 || r.flaggedSLABreaches.length > 0) && (
                <div className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {r.flaggedObjectiveMisses.length + r.flaggedSLABreaches.length} flagged items
                </div>
              )}
            </button>
          ))}
          {activeRecords.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No meetings found.</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a meeting to view details
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selected.meetingNo}</h3>
                  <p className="text-sm text-slate-500 mt-1">{selected.meetingDate} · {selected.venue}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    {selected.attendees.join(', ') || 'No attendees listed'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatus(selected.id, e.target.value as MRMStatus)}
                    className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {(['Draft', 'Scheduled', 'In Progress', 'Reviewed', 'Approved', 'Completed', 'Cancelled'] as MRMStatus[]).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { archiveRecord(selected.id); setSelectedId(null); }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                </div>
              </div>
            </div>

            {/* Flagged items */}
            {(selected.flaggedObjectiveMisses.length > 0 || selected.flaggedSLABreaches.length > 0) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <Flag className="w-4 h-4" /> Auto-flagged Agenda Items (require root-cause discussion)
                </h4>
                {selected.flaggedObjectiveMisses.map((m, i) => (
                  <div key={i} className="text-sm text-red-600 dark:text-red-400 mb-1">⚠ Objective Miss: {m}</div>
                ))}
                {selected.flaggedSLABreaches.map((b, i) => (
                  <div key={i} className="text-sm text-red-600 dark:text-red-400 mb-1">🚨 SLA Breach: {b}</div>
                ))}
              </div>
            )}

            {/* ISO 9001 Input Checklist */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <button
                onClick={() => toggleSection('inputs')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-indigo-500" /> ISO 9001:2015 Cl.9.3 Input Checklist</span>
                {expandedSections['inputs'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedSections['inputs'] && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(Object.keys(INPUT_LABELS) as (keyof typeof selected.inputs)[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.inputs[key]}
                        onChange={(e) =>
                          updateRecord(selected.id, {
                            inputs: { ...selected.inputs, [key]: e.target.checked },
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      {INPUT_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Minutes & Decisions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <button
                onClick={() => toggleSection('minutes')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Minutes & Decisions</span>
                {expandedSections['minutes'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedSections['minutes'] && (
                <>
                  <textarea
                    value={selected.minutesSummary}
                    onChange={(e) => updateRecord(selected.id, { minutesSummary: e.target.value })}
                    rows={4}
                    placeholder="Meeting minutes summary..."
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none"
                  />
                  <textarea
                    value={selected.decisions}
                    onChange={(e) => updateRecord(selected.id, { decisions: e.target.value })}
                    rows={3}
                    placeholder="Key decisions made..."
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none"
                  />
                </>
              )}
            </div>

            {/* Action Items */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Action Items
                </h4>
                <button
                  onClick={() =>
                    addActionItem(selected.id, {
                      description: 'New action item',
                      owner: '',
                      dueDate: '',
                      status: 'Open',
                    })
                  }
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {selected.actionItems.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex-1 space-y-1">
                      <input
                        value={a.description}
                        onChange={(e) => updateActionItem(selected.id, a.id, { description: e.target.value })}
                        className="w-full text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none text-slate-700 dark:text-slate-200"
                      />
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <input
                            value={a.owner}
                            onChange={(e) => updateActionItem(selected.id, a.id, { owner: e.target.value })}
                            placeholder="Owner"
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none"
                          />
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <input
                            type="date"
                            value={a.dueDate}
                            onChange={(e) => updateActionItem(selected.id, a.id, { dueDate: e.target.value })}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none"
                          />
                        </span>
                      </div>
                    </div>
                    <select
                      value={a.status}
                      onChange={(e) =>
                        updateActionItem(selected.id, a.id, {
                          status: e.target.value as MRMActionItem['status'],
                          closedAt: e.target.value === 'Closed' ? new Date().toISOString() : undefined,
                        })
                      }
                      className="text-xs border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Closed</option>
                    </select>
                  </div>
                ))}
                {selected.actionItems.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No action items yet.</p>
                )}
              </div>
            </div>

            {/* Approval Workflow */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Approval Workflow</h4>
              {selected.status === 'Draft' && (
                <button
                  onClick={() => reviewMinutes(selected.id, user?.name || 'System')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Submit for Review
                </button>
              )}
              {selected.status === 'Reviewed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMinutes(selected.id, user?.name || 'System')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Approve Minutes
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'Draft')}
                    className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Return to Draft
                  </button>
                </div>
              )}
              {selected.status === 'Approved' && (
                <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <p><strong>Reviewed By:</strong> {selected.reviewedBy} on {selected.reviewDate ? new Date(selected.reviewDate).toLocaleDateString() : '-'}</p>
                  <p><strong>Approved By:</strong> {selected.approvedBy} on {selected.approvalDate ? new Date(selected.approvalDate).toLocaleDateString() : '-'}</p>
                </div>
              )}
              {!['Draft', 'Reviewed', 'Approved'].includes(selected.status) && (
                <p className="text-sm text-slate-500">Minutes must be marked as 'Draft' to begin approval workflow.</p>
              )}
            </div>
          </div>
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
  }) => void;
  suggestedNo: string;
}) {
  const [meetingNo, setMeetingNo] = useState(suggestedNo);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [chairperson, setChairperson] = useState('GM / COO');
  const [venue, setVenue] = useState('PTA Board Room — Jubail');
  const [attendeesStr, setAttendeesStr] = useState('General Manager, QA Manager, Operations Manager, Technical Director');
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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 animate-modal-enter">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Schedule Management Review Meeting</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Number *</label>
              <input
                required
                value={meetingNo}
                onChange={(e) => setMeetingNo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Date *</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chairperson</label>
              <input
                value={chairperson}
                onChange={(e) => setChairperson(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Venue</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attendees (comma-separated)</label>
            <input
              value={attendeesStr}
              onChange={(e) => setAttendeesStr(e.target.value)}
              placeholder="e.g. GM, QA Manager, Operations Manager"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agenda Items (one per line)</label>
            <textarea
              rows={4}
              value={agendaStr}
              onChange={(e) => setAgendaStr(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100 dark:border-slate-750">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Schedule Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
