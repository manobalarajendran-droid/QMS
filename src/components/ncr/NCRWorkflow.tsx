import { useState } from 'react';
import { useNCRStore } from '../../store/useNCRStore';
import type { NCRRecordStatus, NCRRecord } from '../../store/useNCRStore';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../shared/StatusBadge';
import {
  Clock,
  CheckCircle,
  X,
  GitCommit,
  ArrowRight
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

export function NCRWorkflow() {
  const records = useNCRStore((state) => state.records);
  const updateStatus = useNCRStore((state) => state.updateStatus);
  const updateRecord = useNCRStore((state) => state.updateRecord);

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const selectedRecord = records.find((r) => r.id === selectedRecordId) || null;
  const filteredRecords = records.filter(r => showArchived ? true : !r.isArchived);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col p-2">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-text-primary">NCR Workflow Board</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
            Show Archived
          </label>
          <button onClick={() => setShowForm(true)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-2">
            + New NCR
          </button>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <div key={status} className="flex flex-col min-w-[320px] max-w-[320px] bg-surface-secondary rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between rounded-t-xl">
              <span className="font-semibold text-text-primary">{STATUS_LABELS[status]}</span>
              <span className="text-xs font-bold bg-surface-hover text-text-secondary px-2.5 py-1 rounded-full border border-border">
                {filteredRecords.filter(r => r.status === status).length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredRecords
                .filter(r => r.status === status)
                .map(record => (
                  <NCRCard 
                    key={record.id} 
                    record={record} 
                    onClick={() => setSelectedRecordId(record.id)} 
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {selectedRecord && (
        <NCRDetailModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecordId(null)} 
          updateStatus={updateStatus}
          updateRecord={updateRecord}
        />
      )}
    
      {showForm && (
        <NCRFormModal 
          onClose={() => setShowForm(false)} 
          onSubmit={(data) => {
            useNCRStore.getState().addRecord({...data, status: 'Open'});
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

    </div>
  );
}

function calculateSLA(record: NCRRecord) {
  if (!record.createdAt || record.status === 'Closed') return null;
  const classification = record.classification || 'NCR';
  const totalDays = SLA_DAYS[classification] || 14;
  
  const createdDate = new Date(record.createdAt);
  const deadlineDate = new Date(createdDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
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

function NCRDetailModal({ 
  record, 
  onClose, 
  updateStatus, 
  updateRecord 
}: { 
  record: NCRRecord; 
  onClose: () => void; 
  updateStatus: (id: string, s: NCRRecordStatus) => void; 
  updateRecord: (id: string, data: any) => void;
}) {
  const { user } = useAuth();
  
  // Role checks
  const isMR = user?.role === 'admin' || user?.role === 'qa_manager';
  const isSpoc = user?.role === 'department_spoc' || isMR;

  const [rcaData, setRcaData] = useState(() => {
    return (record.rca || '').split('\n\n5-Whys:\n')[0];
  });
  
  const [fiveWhys, setFiveWhys] = useState<string[]>(() => {
    const parts = (record.rca || '').split('\n\n5-Whys:\n');
    const whys = ['', '', '', '', ''];
    if (parts[1]) {
      const lines = parts[1].split('\n');
      lines.forEach(line => {
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
    const combined = fiveWhys.filter(w => w.trim() !== '').map((w, i) => `Why ${i+1}: ${w}`).join('\n');
    updateRecord(record.id, { rca: rcaData + (combined ? '\n\n5-Whys:\n' + combined : '') });
    updateStatus(record.id, 'CAPA_Planned');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-secondary/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-text-primary">{record.ref || 'Draft NCR'}</h2>
              <StatusBadge status={STATUS_LABELS[record.status]} />
            </div>
            <div className="flex items-center gap-4 text-sm text-text-tertiary">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Created {new Date(record.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="font-medium text-text-secondary">{record.classification}</span>
              <span>•</span>
              <span className="font-medium text-text-secondary">{record.project}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
               if (window.confirm('Delete this NCR?')) {
                 useNCRStore.getState().deleteRecord(record.id);
                 onClose();
               }
            }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              Delete
            </button>
            <button onClick={() => {
               updateRecord(record.id, { isArchived: !record.isArchived });
               onClose();
            }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors">
              {record.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-tertiary hover:text-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            <div className="grid grid-cols-2 gap-8">
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
              <section className="bg-accent-subtle/30 p-6 rounded-xl border border-accent/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-text-primary">Root Cause Analysis (5-Whys)</h3>
                  {isSpoc ? (
                    <span className="text-xs font-semibold px-2 py-1 bg-accent text-white rounded-md">SPOC Access</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-md">View Only</span>
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
                        className="bg-accent text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-2"
                      >
                        Submit Root Cause <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-lg border border-red-100 dark:bg-red-900/20 dark:border-red-800">
                        You do not have permission to submit Root Cause. This requires SPOC or QA Manager role.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {record.status === 'Verification' && (
              <section className="bg-surface-secondary p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-text-primary mb-4">Verification & Closure</h3>
                <div className="p-4 bg-surface rounded-lg border border-border mb-6">
                  <h4 className="text-sm font-semibold text-text-tertiary mb-2">Proposed Corrective Action</h4>
                  <p className="text-text-primary">{record.corrAction || 'No corrective action recorded'}</p>
                </div>
                
                {isMR ? (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => useNCRStore.getState().approveNCR(record.id, user?.name || 'System', 'Approved for closure')}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> Approve & Close NCR
                    </button>
                    <button 
                      onClick={() => useNCRStore.getState().rejectNCR(record.id, user?.name || 'System', 'Rejected at verification')}
                      className="bg-surface text-text-primary border border-border px-6 py-2.5 rounded-lg font-semibold hover:bg-surface-hover transition-colors shadow-sm flex items-center gap-2"
                    >
                      <X className="w-5 h-5" /> Reject (Return to CAPA)
                    </button>
                  </div>
                ) : (
                   <div className="bg-red-50 border border-red-100 p-4 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                     <p className="text-sm text-red-600 font-medium">Only Management Representative (Admin / QA Manager) can verify and close this NCR.</p>
                   </div>
                )}
              </section>
            )}

            {/* Workflow progression (admin override) */}
            {isMR && (
              <section className="mt-8 pt-6 border-t border-border border-dashed flex items-center gap-4 bg-surface-secondary/50 p-4 rounded-xl">
                <span className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">Workflow Actions:</span>
                <div className="flex gap-2 flex-wrap">
                  {record.status === 'Open' && <button className="px-4 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-md shadow-sm transition-colors" onClick={() => updateStatus(record.id, 'Investigation')}>Start Investigation</button>}
                  {record.status === 'Investigation' && <button className="px-4 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-md shadow-sm transition-colors" onClick={() => updateStatus(record.id, 'RootCause')}>Request RCA</button>}
                  {record.status === 'RootCause' && <button className="px-4 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-md shadow-sm transition-colors" onClick={() => updateStatus(record.id, 'CAPA_Planned')}>Start CAPA Planning</button>}
                  {record.status === 'CAPA_Planned' && <button className="px-4 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-md shadow-sm transition-colors" onClick={() => updateStatus(record.id, 'CAPA_InProgress')}>Start CAPA</button>}
                  {record.status === 'CAPA_InProgress' && <button className="px-4 py-1.5 text-sm font-medium bg-surface hover:bg-surface-hover border border-border rounded-md shadow-sm transition-colors" onClick={() => updateStatus(record.id, 'Verification')}>Request Verification</button>}
                </div>
              </section>
            )}
          </div>

          {/* Timeline Sidebar */}
          <div className="w-80 border-l border-border bg-surface-secondary/30 p-6 flex flex-col">
            <h3 className="font-bold text-text-primary mb-6 uppercase tracking-wider text-sm">State History</h3>
            <div className="space-y-0 relative">
              {STATUSES.map((status, idx) => {
                const isCurrent = record.status === status;
                const isPast = STATUSES.indexOf(record.status) > idx;
                
                return (
                  <div key={status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 z-10
                        ${isCurrent ? 'border-accent text-accent bg-surface shadow-sm' 
                          : isPast ? 'border-green-500 text-green-500 bg-surface shadow-sm' 
                          : 'border-border text-border bg-surface-secondary'}`}>
                        {isPast ? <CheckCircle className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
                      </div>
                      {idx !== STATUSES.length - 1 && (
                        <div className={`w-0.5 h-12 -my-1 ${isPast ? 'bg-green-500' : 'bg-border'}`}></div>
                      )}
                    </div>
                    <div className="pb-8 pt-1">
                      <div className={`font-semibold ${isCurrent ? 'text-accent' : isPast ? 'text-text-primary' : 'text-text-tertiary'}`}>
                        {STATUS_LABELS[status]}
                      </div>
                      {(isCurrent || isPast) && idx === 0 && (
                        <div className="text-xs text-text-tertiary mt-1">
                          Started: {new Date(record.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function NCRFormModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    ref: '', project: '', raisedBy: '', auditeeName: '', auditeeDept: '', corrBy: '', classification: 'NCR', desc: '', objEvidence: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl p-6 shadow-2xl border border-border">
        <h3 className="text-xl font-bold mb-4">Create New NCR</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <input placeholder="Reference" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.ref} onChange={e => setFormData({...formData, ref: e.target.value})} required />
          <input placeholder="Project" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} required />
          <input placeholder="Raised By" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.raisedBy} onChange={e => setFormData({...formData, raisedBy: e.target.value})} required />
          <input placeholder="Assigned To (Action Owner)" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.corrBy} onChange={e => setFormData({...formData, corrBy: e.target.value})} required />
          <input placeholder="Auditee Dept" className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.auditeeDept} onChange={e => setFormData({...formData, auditeeDept: e.target.value})} required />
          <select className="border border-border bg-surface p-2 rounded focus:ring-2 focus:ring-accent outline-none" value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value as any})}>
            <option value="NCR">NCR</option>
            <option value="Potential NCR">Potential NCR</option>
            <option value="Observation">Observation</option>
          </select>
          <div className="col-span-2">
            <textarea placeholder="Description" className="border border-border bg-surface p-2 rounded w-full focus:ring-2 focus:ring-accent outline-none" rows={3} value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} required />
          </div>
          <div className="col-span-2">
            <textarea placeholder="Objective Evidence" className="border border-border bg-surface p-2 rounded w-full focus:ring-2 focus:ring-accent outline-none" rows={2} value={formData.objEvidence} onChange={e => setFormData({...formData, objEvidence: e.target.value})} required />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-surface-hover">Cancel</button>
          <button onClick={() => onSubmit(formData)} className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover">Submit</button>
        </div>
      </div>
    </div>
  );
}
