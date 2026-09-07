import { useState, useMemo } from 'react';
import { useCSIStore } from '../../store/useCSIStore';
import { Target, Search, Edit, Trash, Archive } from 'lucide-react';
import { useAuditStore } from '../../store/useAuditStore';
import { StatusBadge } from '../shared/StatusBadge';
import { normalizeScore } from '../../lib/csiScore';

export function CSIDashboard() {
  const records = useCSIStore(s => s.records);
  const addRecord = useCSIStore(s => s.addRecord);
  const updateRecord = useCSIStore(s => s.updateRecord);
  const deleteRecord = useCSIStore(s => s.deleteRecord);
  
  const [filterYear, setFilterYear] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const years = useMemo(() => {
    const yrs = new Set(records.map(r => String(r.yr || '')).filter(Boolean));
    return ['All', ...Array.from(yrs).sort().reverse()];
  }, [records]);

  const active = useMemo(() => {
    return records.filter(r => {
      if (!showArchived && r.isArchived) return false;
      if (filterYear !== 'All' && String(r.yr) !== filterYear) return false;
      if (search) {
        const q = search.toLowerCase();
        return (r.cl?.toLowerCase() || '').includes(q) || (r.proj?.toLowerCase() || '').includes(q);
      }
      return true;
    });
  }, [records, filterYear, search, showArchived]);

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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">CSI Surveys</h2>
          <button onClick={() => { setEditingRecord(null); setShowForm(true); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">+ New Survey</button>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-300"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/> Show Archived</label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className={`text-2xl font-bold ${isTargetMet ? 'text-green-600' : 'text-amber-600'}`}>{avgScore}%</div>
            <div className="text-xs text-slate-500 mt-1">Avg CSI Score</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{active.length}</div>
            <div className="text-xs text-slate-500 mt-1">Surveys Received</div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search client/project..." 
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-24 text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {active.map(r => {
            const score = normalizeScore(r.score);
            return (
              <button 
                key={r.id} 
                onClick={() => setSelectedId(r.id)} 
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedId === r.id 
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{r.cl} {r.isArchived ? '(Archived)' : ''}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60'}`}>{score}%</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">{r.proj}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Overall Satisfaction Distribution Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shrink-0">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{selected.cl}</h3>
                <p className="text-sm text-slate-500">{selected.proj}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingRecord(selected); setShowForm(true); }} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full transition-colors"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleArchive(selected.id, !!selected.isArchived)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-600 rounded-full transition-colors"><Archive className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(selected.id)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-600 rounded-full transition-colors"><Trash className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-400 font-medium">Overall Score</div>
                <div className="text-xl font-bold mt-1 text-slate-800 dark:text-white">{normalizeScore(selected.score)}%</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-400 font-medium mb-1">Rating</div>
                <StatusBadge status={selected.rating} />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-400 font-medium">Date</div>
                <div className="text-sm font-medium mt-1 text-slate-800 dark:text-white">{selected.dt || selected.yr}</div>
              </div>
            </div>
            
            {selected.suggestions && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Suggestions</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 italic">"{selected.suggestions}"</p>
              </div>
            )}
            {selected.obs && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Observations</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selected.obs}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
            <Target className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Select a survey from the list to inspect client feedback</p>
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

function CSIFormModal({ record, onClose, onSubmit }: { record: any, onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    cl: record?.cl || '', proj: record?.proj || '', yr: record?.yr || new Date().getFullYear(),
    dt: record?.dt || '', suggestions: record?.suggestions || '', obs: record?.obs || '', score: record?.score || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreVal = Number(formData.score) / 100;
    let rating = 'Needs Improvement';
    if (scoreVal >= 0.9) rating = 'Excellent';
    else if (scoreVal >= 0.85) rating = 'Good';
    else if (scoreVal >= 0.8) rating = 'Satisfactory';
    else if (scoreVal >= 0.75) rating = 'Fair';
    
    onSubmit({ ...formData, rating, score: scoreVal });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 max-h-[90vh] overflow-y-auto animate-modal-enter">
        <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{record ? 'Edit' : 'New'} Survey</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Client *</label>
              <input 
                placeholder="e.g. SABIC / ARAMCO" 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                value={formData.cl} 
                onChange={e => setFormData({...formData, cl: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Project *</label>
              <input 
                placeholder="e.g. Turnaround Maintenance" 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                value={formData.proj} 
                onChange={e => setFormData({...formData, proj: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Date *</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                value={formData.dt} 
                onChange={e => setFormData({...formData, dt: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Year *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                value={formData.yr} 
                onChange={e => setFormData({...formData, yr: e.target.value})} 
                required 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Overall Score (0-100) *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                value={formData.score} 
                onChange={e => setFormData({...formData, score: e.target.value})} 
                required 
                min="0" 
                max="100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Suggestions & Recommendations</label>
              <textarea 
                placeholder="Client comments and suggestions..." 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                rows={2} 
                value={formData.suggestions} 
                onChange={e => setFormData({...formData, suggestions: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Observations</label>
              <textarea 
                placeholder="Internal audit observations..." 
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                rows={2} 
                value={formData.obs} 
                onChange={e => setFormData({...formData, obs: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Submit Survey</button>
          </div>
        </form>
      </div>
    </div>
  );
}

