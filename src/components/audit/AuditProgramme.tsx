import { useState } from 'react';
import { ClipboardList, Plus, Search, Calendar, FileText, CheckCircle2, X, Save, Link as LinkIcon } from 'lucide-react';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import type { AuditProgrammeRecord } from '../../store/useAuditProgrammeStore';
import { useNCRStore } from '../../store/useNCRStore';
import { StatusBadge } from '../shared/StatusBadge';


export function AuditProgramme() {
  const { records, addRecord, updateRecord } = useAuditProgrammeStore();
  const ncrRecords = useNCRStore((s) => s.records);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AuditProgrammeRecord | null>(null);
  
  const [formData, setFormData] = useState<Partial<AuditProgrammeRecord>>({});

  const filteredRecords = records.filter(
    (r) =>
      r.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.dep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.aud?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (record?: AuditProgrammeRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        ...record,
        ncrIds: record.ncrIds || [],
      });
    } else {
      setEditingRecord(null);
      setFormData({
        status: 'Planned',
        ncrIds: [],
        nc: 0,
        obs: 0,
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
      addRecord(formData as Omit<AuditProgrammeRecord, 'id' | 'createdAt' | 'updatedAt'>);
    }
    handleCloseModal();
  };

  const toggleNcrLink = (ncrId: string) => {
    setFormData(prev => {
      const current = prev.ncrIds || [];
      if (current.includes(ncrId)) {
        return { ...prev, ncrIds: current.filter(id => id !== ncrId) };
      }
      return { ...prev, ncrIds: [...current, ncrId] };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Audit Programme</h2>
          <p className="text-sm text-text-secondary mt-1">Annual internal audit schedule and findings</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Audit
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search audits..."
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
                <th className="px-6 py-4 font-semibold">Ref & Date</th>
                <th className="px-6 py-4 font-semibold">Scope & Dept</th>
                <th className="px-6 py-4 font-semibold">Auditor & Auditee</th>
                <th className="px-6 py-4 font-semibold text-center">NC / OBS</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.map((record) => (
                <tr 
                  key={record.id} 
                  className="hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => handleOpenModal(record)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="font-medium text-text-primary">{record.ref}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-text-secondary">
                      <Calendar className="w-3.5 h-3.5" />
                      {record.dt}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-text-primary">{record.sc}</div>
                    <div className="text-sm text-text-secondary mt-0.5">{record.dep}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">Auditor: {record.aud}</div>
                    {record.auditee && (
                      <div className="text-sm text-text-secondary mt-0.5">Auditee: {record.auditee}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-lg min-w-[1.5rem] font-semibold text-red-500">{record.nc || 0}</div>
                        <div className="text-xs text-text-tertiary">NC</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg min-w-[1.5rem] font-semibold text-amber-500">{record.obs || 0}</div>
                        <div className="text-xs text-text-tertiary">OBS</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={record.status} />
                    </div>
                    {record.rpt && <div className="text-xs text-text-tertiary mt-1">Rpt: {record.rpt}</div>}
                    {record.ncrIds && record.ncrIds.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                        <LinkIcon className="w-3 h-3" />
                        {record.ncrIds.length} NCR(s) linked
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-tertiary">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No audits found matching your search.</p>
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
                {editingRecord ? 'Edit Audit Record' : 'Add Audit Record'}
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
                    value={formData.ref || ''}
                    onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.dt || ''}
                    onChange={(e) => setFormData({ ...formData, dt: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Scope</label>
                  <input
                    type="text"
                    value={formData.sc || ''}
                    onChange={(e) => setFormData({ ...formData, sc: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.dep || ''}
                    onChange={(e) => setFormData({ ...formData, dep: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Auditor</label>
                  <input
                    type="text"
                    value={formData.aud || ''}
                    onChange={(e) => setFormData({ ...formData, aud: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Auditee</label>
                  <input
                    type="text"
                    value={formData.auditee || ''}
                    onChange={(e) => setFormData({ ...formData, auditee: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Report Issued">Report Issued</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Report Ref</label>
                  <input
                    type="text"
                    value={formData.rpt || ''}
                    onChange={(e) => setFormData({ ...formData, rpt: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">NC Count</label>
                  <input
                    type="number"
                    value={formData.nc || 0}
                    onChange={(e) => setFormData({ ...formData, nc: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">OBS Count</label>
                  <input
                    type="number"
                    value={formData.obs || 0}
                    onChange={(e) => setFormData({ ...formData, obs: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Findings Entry</label>
                <textarea
                  value={formData.fnd || ''}
                  onChange={(e) => setFormData({ ...formData, fnd: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary text-sm transition-colors"
                  placeholder="Enter audit findings..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Link NCRs</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-surface-secondary">
                  {ncrRecords.map(ncr => {
                    const isLinked = (formData.ncrIds || []).includes(ncr.id);
                    return (
                      <div 
                        key={ncr.id}
                        onClick={() => toggleNcrLink(ncr.id)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${isLinked ? 'bg-accent/10 border-accent/20 border' : 'hover:bg-surface-hover border border-transparent'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isLinked ? 'text-accent' : 'text-text-primary'}`}>
                            {ncr.ref || 'Unnamed NCR'}
                          </span>
                          <span className="text-xs text-text-secondary truncate max-w-sm">
                            {ncr.desc}
                          </span>
                        </div>
                        {isLinked && <CheckCircle2 className="w-4 h-4 text-accent" />}
                      </div>
                    );
                  })}
                  {ncrRecords.length === 0 && (
                    <div className="p-2 text-sm text-text-tertiary">No NCRs available to link.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface-secondary/50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
