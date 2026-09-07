import { useState } from 'react';
import { useSupplierEvalStore } from '../../store/useSupplierEvalStore';
import type { SupplierStatus } from '../../store/useSupplierEvalStore';
import { useAuth } from '../../hooks/useAuth';
import { Building2, Plus, ShieldCheck } from 'lucide-react';

import { StatusBadge } from '../shared/StatusBadge';

export function SupplierDashboard() {
  const { user } = useAuth();
  const records = useSupplierEvalStore(s => s.records);
  const addRecord = useSupplierEvalStore(s => s.addRecord);
  const updateRecord = useSupplierEvalStore(s => s.updateRecord);
  const approveSupplier = useSupplierEvalStore(s => s.approveSupplier);
  const rejectSupplier = useSupplierEvalStore(s => s.rejectSupplier);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selected = records.find(r => r.id === selectedId);

  const avgScore = records.length ? Math.round(records.reduce((a, b) => a + b.score, 0) / records.length) : 0;
  const approvedCount = records.filter(r => r.status === 'Approved').length;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left List */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-xs text-slate-500">Approved</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{avgScore}%</div>
            <div className="text-xs text-slate-500">Avg Score</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> AVL
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {records.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedId === r.id ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{r.name}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-slate-500 truncate">{r.category}</div>
                <div className="text-xs font-bold text-indigo-600">{r.score}%</div>
              </div>
            </button>
          ))}
          {records.length === 0 && <p className="text-xs text-center text-slate-400 py-8">No suppliers in AVL.</p>}
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
                    {selected.name}
                    {selected.status === 'Approved' && <ShieldCheck className="w-5 h-5 text-green-500" />}
                  </h3>
                  <div className="text-sm text-slate-500 mt-1">{selected.category}</div>
                </div>
                <select
                  value={selected.status}
                  onChange={e => updateRecord(selected.id, { status: e.target.value as SupplierStatus })}
                  className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                >
                  <option>Pending Evaluation</option>
                  <option>Under Evaluation</option>
                  <option>Approved</option>
                  <option>Conditional</option>
                  <option>Rejected</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-xs font-medium text-slate-400">Score</span>
                  <div className="flex items-center gap-1 mt-1 text-slate-700 dark:text-slate-300">
                    <input type="number" value={selected.score} onChange={e => updateRecord(selected.id, { score: Number(e.target.value) })} className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none" /> %
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400">Next Evaluation</span>
                  <div className="mt-1">
                    <input type="date" value={selected.nextEvalDate} onChange={e => updateRecord(selected.id, { nextEvalDate: e.target.value })} className="bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-700 dark:text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Findings / Remarks</h4>
                <textarea rows={4} value={selected.findings} onChange={e => updateRecord(selected.id, { findings: e.target.value })} className="w-full text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 resize-none" />
              </div>
            </div>

            {/* Approval Workflow */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Approval Workflow</h4>
              {selected.status === 'Under Evaluation' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveSupplier(selected.id, user?.name || 'System')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Approve Supplier
                  </button>
                  <button
                    onClick={() => rejectSupplier(selected.id, user?.name || 'System')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Reject Supplier
                  </button>
                </div>
              )}
              {(selected.status === 'Approved' || selected.status === 'Rejected') && (
                <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <p><strong>Status set by:</strong> {selected.approvedBy || selected.reviewedBy || 'System'}</p>
                  <p><strong>Date:</strong> {selected.approvalDate || selected.reviewDate ? new Date(selected.approvalDate || selected.reviewDate || '').toLocaleDateString() : '-'}</p>
                </div>
              )}
              {!['Under Evaluation', 'Approved', 'Rejected'].includes(selected.status) && (
                <p className="text-sm text-slate-500">Set status to 'Under Evaluation' to begin approval workflow.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a supplier to view evaluation details</p>
          </div>
        )}
      </div>

      {showForm && (
        <SupplierFormModal 
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            addRecord({ ...data, status: 'Pending Evaluation', score: 0, findings: '' });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SupplierFormModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '', category: 'General', contactPerson: '', email: '', lastEvalDate: '', nextEvalDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 animate-modal-enter">
        <h3 className="text-xl font-bold mb-5 text-slate-900 dark:text-white">Add New Supplier</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Name *</label>
            <input
              placeholder="e.g. Acme Precision Tools"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category *</label>
            <input
              placeholder="e.g. Mechanical, Calibration, Software"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person</label>
              <input
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.contactPerson}
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                placeholder="e.g. contact@supplier.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Last Evaluation Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.lastEvalDate}
                onChange={e => setFormData({...formData, lastEvalDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Next Evaluation Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.nextEvalDate}
                onChange={e => setFormData({...formData, nextEvalDate: e.target.value})}
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
              Add Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
