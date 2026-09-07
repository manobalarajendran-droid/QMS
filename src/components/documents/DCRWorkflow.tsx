import { useState } from 'react';
import { useDCRStore } from '../../store/useDCRStore';
import type { DCRRecord, DCRStatus } from '../../store/useDCRStore';
import { FileText, Plus, CheckCircle2, AlertTriangle, Users, Info } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';



export function DCRWorkflow() {
  const records = useDCRStore((s) => s.records);
  const addRecord = useDCRStore((s) => s.addRecord);
  const updateRecord = useDCRStore((s) => s.updateRecord);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ docNo: '', title: '', department: 'Operations', changeDescription: '', reason: '', status: 'Draft' as DCRStatus });

  const active = records.filter(r => !r.isArchived);
  const selected = active.find(r => r.id === selectedId);

  const pendingCount = active.filter(r => r.status.includes('Pending')).length;

  const handleCreate = () => {
    if (!form.title) return;
    addRecord({ ...form, requestor: 'Current User', docId: '' });
    setShowNew(false);
    setForm({ docNo: '', title: '', department: 'Operations', changeDescription: '', reason: '', status: 'Draft' });
  };

  const advanceStatus = (r: DCRRecord) => {
    const states: DCRStatus[] = ['Draft', 'Pending Review', 'Pending QA Approval', 'Approved', 'Implemented'];
    const idx = states.indexOf(r.status);
    if (idx >= 0 && idx < states.length - 1) {
      updateRecord(r.id, { status: states[idx + 1] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left List */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Document Change Requests
          </h2>
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
          >
            <Plus className="w-3 h-3" /> New DCR
          </button>
        </div>
        
        {pendingCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {pendingCount} request(s) require attention
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {active.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedId === r.id 
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm' 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.dcrNo}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-slate-500 mt-1 truncate">{r.title || r.docNo}</div>
            </button>
          ))}
          {active.length === 0 && <p className="text-xs text-center text-slate-400 py-8">No DCRs found.</p>}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 overflow-y-auto">
        {showNew ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">New Change Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Document Number</label>
                <input 
                  value={form.docNo} 
                  onChange={e => setForm(f => ({ ...f, docNo: e.target.value }))} 
                  placeholder="e.g. SOP-QA-004"
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Document Title</label>
                <input 
                  value={form.title} 
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                  placeholder="e.g. Calibration Management Procedure"
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Department</label>
                <input 
                  value={form.department} 
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} 
                  placeholder="e.g. Quality Assurance"
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Description of Change</label>
                <textarea 
                  rows={3} 
                  value={form.changeDescription} 
                  onChange={e => setForm(f => ({ ...f, changeDescription: e.target.value }))} 
                  placeholder="Summarize exact sections or contents being modified..."
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Reason for Change</label>
                <textarea 
                  rows={2} 
                  value={form.reason} 
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} 
                  placeholder="Business or regulatory justification..."
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors" 
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors">Submit Request</button>
              <button onClick={() => setShowNew(false)} className="border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">Cancel</button>
            </div>
          </div>
        ) : selected ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selected.dcrNo}</h3>
                  <div className="text-sm text-slate-500 mt-1">{selected.docNo} — {selected.title}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-xs font-medium text-slate-400">Requestor</span>
                  <div className="flex items-center gap-1 mt-1 text-slate-700 dark:text-slate-300"><Users className="w-3 h-3" /> {selected.requestor} ({selected.department})</div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400">Created</span>
                  <div className="mt-1 text-slate-700 dark:text-slate-300">{new Date(selected.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Description of Change</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">{selected.changeDescription}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Reason for Change</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">{selected.reason}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Workflow Actions</h4>
              <div className="flex gap-2 flex-wrap">
                {selected.status !== 'Implemented' && selected.status !== 'Rejected' && (
                  <button onClick={() => advanceStatus(selected)} className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                    Advance Stage <CheckCircle2 className="w-3 h-3" />
                  </button>
                )}
                {selected.status !== 'Implemented' && selected.status !== 'Rejected' && (
                  <button onClick={() => updateRecord(selected.id, { status: 'Rejected' })} className="bg-red-100 text-red-700 text-xs px-4 py-2 rounded-lg hover:bg-red-200">
                    Reject Request
                  </button>
                )}
                <button onClick={() => updateRecord(selected.id, { isArchived: true })} className="border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 ml-auto">
                  Archive
                </button>
                <button onClick={() => { if(window.confirm('Delete this DCR?')) { useDCRStore.getState().deleteRecord(selected.id); setSelectedId(null); } }} className="border border-red-200 text-red-500 text-xs px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 ml-2">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Info className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a Document Change Request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
