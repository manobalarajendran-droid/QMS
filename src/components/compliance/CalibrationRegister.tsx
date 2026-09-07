import { useState } from 'react';
import { useCalibStore } from '../../store/useCalibStore';
import type { CalibStatus } from '../../store/useCalibStore';
import { Settings, Plus, AlertTriangle, CheckCircle2, Clock, MapPin, Hash, Search } from 'lucide-react';

import { StatusBadge } from '../shared/StatusBadge';

export function CalibrationRegister() {
  const records = useCalibStore(s => s.records);
  const addRecord = useCalibStore(s => s.addRecord);
  const updateRecord = useCalibStore(s => s.updateRecord);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Auto-calculate status based on nextCalibDate
  const processedRecords = records.map(r => {
    let computedStatus = r.status;
    if (r.status === 'Active' || r.status === 'Due Soon' || r.status === 'Overdue') {
      const daysLeft = (new Date(r.nextCalibDate).getTime() - new Date().getTime()) / 86400000;
      if (daysLeft < 0) computedStatus = 'Overdue';
      else if (daysLeft <= 30) computedStatus = 'Due Soon';
      else computedStatus = 'Active';
    }
    return { ...r, status: computedStatus };
  });

  const active = processedRecords.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      return r.equipNo.toLowerCase().includes(q) || r.equipName.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = active.find(r => r.id === selectedId);

  const overdueCount = active.filter(r => r.status === 'Overdue').length;
  const dueSoonCount = active.filter(r => r.status === 'Due Soon').length;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left List */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{overdueCount}</div>
            <div className="text-xs text-slate-500">Overdue</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className={`text-2xl font-bold ${dueSoonCount > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{dueSoonCount}</div>
            <div className="text-xs text-slate-500">Due {"<"} 30 days</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-500" /> Equipment Register
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {active.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === r.id ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{r.equipNo}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-slate-500 mt-1 truncate">{r.equipName}</div>
              {r.status === 'Due Soon' || r.status === 'Overdue' ? (
                <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${r.status === 'Overdue' ? 'text-red-500' : 'text-amber-500'}`}>
                  <AlertTriangle className="w-3 h-3" /> Due: {r.nextCalibDate}
                </div>
              ) : null}
            </button>
          ))}
          {active.length === 0 && <p className="text-xs text-center text-slate-400 py-8">No equipment found.</p>}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <input value={selected.equipNo} onChange={e => updateRecord(selected.id, { equipNo: e.target.value })} className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-40" />
                    {selected.status === 'Active' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </h3>
                  <div className="mt-1">
                    <input value={selected.equipName} onChange={e => updateRecord(selected.id, { equipName: e.target.value })} className="text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full max-w-md text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                <select
                  value={selected.status}
                  onChange={e => updateRecord(selected.id, { status: e.target.value as CalibStatus })}
                  className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                >
                  <option>Active</option>
                  <option>Out of Service</option>
                  <option>Scrapped</option>
                </select>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 text-sm border-t border-slate-100 dark:border-slate-700 pt-4">
                <div>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Hash className="w-3 h-3" /> Serial No</span>
                  <input value={selected.serialNo} onChange={e => updateRecord(selected.id, { serialNo: e.target.value })} className="mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Settings className="w-3 h-3" /> Manufacturer</span>
                  <input value={selected.manufacturer} onChange={e => updateRecord(selected.id, { manufacturer: e.target.value })} className="mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                  <input value={selected.location} onChange={e => updateRecord(selected.id, { location: e.target.value })} className="mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full text-slate-700 dark:text-slate-300" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> Calibration Schedule</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-400 font-medium">Last Calibrated</div>
                  <input type="date" value={selected.lastCalibDate} onChange={e => updateRecord(selected.id, { lastCalibDate: e.target.value })} className="mt-1 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 w-full" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-400 font-medium">Frequency (Months)</div>
                  <input type="number" value={selected.freqMonths} onChange={e => updateRecord(selected.id, { freqMonths: Number(e.target.value) })} className="mt-1 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300 w-full" />
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                  <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Next Due Date</div>
                  <input type="date" value={selected.nextCalibDate} onChange={e => updateRecord(selected.id, { nextCalibDate: e.target.value })} className="mt-1 bg-transparent border-b border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 outline-none text-indigo-900 dark:text-indigo-200 font-bold w-full" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-400">Certificate No.</span>
                <input value={selected.certificateNo} onChange={e => updateRecord(selected.id, { certificateNo: e.target.value })} placeholder="Enter certificate number..." className="mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full text-slate-700 dark:text-slate-300" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Notes</h4>
              <textarea rows={3} value={selected.notes} onChange={e => updateRecord(selected.id, { notes: e.target.value })} className="w-full text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 resize-none" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Settings className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select equipment to view calibration details</p>
          </div>
        )}
      </div>

      {showForm && (
        <CalibrationFormModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            addRecord({ ...data, status: 'Active' });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function CalibrationFormModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    equipNo: '', equipName: '', manufacturer: '', serialNo: '',
    location: '', freqMonths: 12, lastCalibDate: new Date().toISOString().split('T')[0],
    nextCalibDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    certificateNo: '', notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 animate-modal-enter">
        <h3 className="text-xl font-bold mb-5 text-slate-900 dark:text-white">Add Equipment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Equipment No *</label>
              <input
                placeholder="e.g. CAL-042"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.equipNo}
                onChange={e => setFormData({...formData, equipNo: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Equipment Name *</label>
              <input
                placeholder="e.g. Digital Caliper"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.equipName}
                onChange={e => setFormData({...formData, equipName: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Manufacturer</label>
              <input
                placeholder="e.g. Mitutoyo"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.manufacturer}
                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Serial No</label>
              <input
                placeholder="e.g. SN-981240"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.serialNo}
                onChange={e => setFormData({...formData, serialNo: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
              <input
                placeholder="e.g. QA Lab A"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frequency (Months)</label>
              <input
                type="number"
                placeholder="12"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.freqMonths}
                onChange={e => setFormData({...formData, freqMonths: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Last Calibration Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.lastCalibDate}
                onChange={e => setFormData({...formData, lastCalibDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Next Calibration Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.nextCalibDate}
                onChange={e => setFormData({...formData, nextCalibDate: e.target.value})}
              />
            </div>
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
              Save Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
