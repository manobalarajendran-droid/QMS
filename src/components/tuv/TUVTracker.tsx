import { useState } from 'react';
import { Target, Search, Clock, FileCheck, CheckCircle2, AlertCircle, X, Save } from 'lucide-react';
import { useTUVStore } from '../../store/useTUVStore';
import type { TUVRecord } from '../../store/useTUVStore';
import { StatusBadge } from '../shared/StatusBadge';


export function TUVTracker() {
  const { records, addRecord, updateRecord } = useTUVStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TUVRecord | null>(null);
  const [formData, setFormData] = useState<Partial<TUVRecord>>({});

  const filteredRecords = records.filter(
    (r) =>
      r.num?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.desc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days;
  };

  const handleOpenModal = (record?: TUVRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData({
        status: 'Open',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({});
  };

  const handleSave = () => {
    if (editingRecord) {
      updateRecord(editingRecord.id, formData);
    } else {
      addRecord(formData as Omit<TUVRecord, 'id' | 'createdAt' | 'updatedAt'>);
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">TÜV Tracker</h2>
          <p className="text-sm text-text-secondary mt-1">Track TÜV recommendations and closures</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Target className="w-4 h-4" />
          Add Recommendation
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search recommendations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-secondary text-xs text-text-tertiary uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4 font-semibold">Ref & Clause</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Owner</th>
                <th className="px-6 py-4 font-semibold">Status & Countdown</th>
                <th className="px-6 py-4 font-semibold">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.map((record) => {
                const daysLeft = getDaysRemaining(record.due);
                const isOverdue = daysLeft !== null && daysLeft < 0;
                
                return (
                  <tr 
                    key={record.id} 
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(record)}
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={record.status} />
                      </div>
                      {record.status !== 'Closed' && record.due && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md inline-flex ${isOverdue ? 'bg-red-500/10 text-red-500' : 
                          daysLeft !== null && daysLeft <= 30 ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-surface-secondary text-text-secondary'}`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left (90-day target)`}
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
              {filteredRecords.length === 0 && (
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingRecord ? 'Edit Recommendation' : 'Add Recommendation'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-surface-hover rounded-lg text-text-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ref Number</label>
                  <input
                    type="text"
                    value={formData.num || ''}
                    onChange={(e) => setFormData({ ...formData, num: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Clause</label>
                  <input
                    type="text"
                    value={formData.cl || ''}
                    onChange={(e) => setFormData({ ...formData, cl: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={formData.desc || ''}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Owner</label>
                  <input
                    type="text"
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due || ''}
                    onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Closed Date</label>
                  <input
                    type="date"
                    value={formData.closed || ''}
                    onChange={(e) => setFormData({ ...formData, closed: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Evidence Linking</label>
                  <textarea
                    value={formData.evidence || ''}
                    onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                    rows={3}
                    placeholder="Enter evidence details or links..."
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-between gap-3 bg-surface-secondary/50">
              <div>
                {editingRecord && editingRecord.status !== 'Closed' && formData.evidence && (
                  <button
                    onClick={() => {
                      updateRecord(editingRecord.id, { ...formData, status: 'Closed', closed: new Date().toISOString().split('T')[0] });
                      handleCloseModal();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify & Close
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
