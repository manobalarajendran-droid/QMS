import { useState, useMemo } from 'react';
import { useDMLStore } from '../../store/useDMLStore';
import type { DMLRecord, DMLRecordStatus } from '../../store/useDMLStore';
import { FileText, ChevronDown, ChevronRight, Search, Edit, Trash, Archive, Plus } from 'lucide-react';
import { useAuditStore } from '../../store/useAuditStore';

import { StatusBadge } from '../shared/StatusBadge';

const LEVEL_COLOR: Record<string, string> = {
  'L1': 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
  'L2': 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
  'L3': 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
  'L4': 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
};

const LEVEL_LABEL: Record<string, string> = {
  'L1': 'Quality Manual',
  'L2': 'Procedures',
  'L3': 'Work Instructions',
  'L4': 'Forms & Records',
};

/** Seed reviewDate values are DD-MM-YYYY, which `new Date(string)` misparses as MM-DD-YYYY (or Invalid Date when day > 12). */
function parseDDMMYYYY(value: string): Date | null {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function DMLManager() {
  const records = useDMLStore((s) => s.records);
  const addRecord = useDMLStore((s) => s.addRecord);
  const updateRecord = useDMLStore((s) => s.updateRecord);
  const deleteRecord = useDMLStore((s) => s.deleteRecord);

  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({ L1: true, L2: true, L3: false, L4: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (!showArchived && r.isArchived) return false;
      const lvl = r.hierarchyLevel || (r as any).lv || '';
      if (filterLevel !== 'All' && lvl !== filterLevel) return false;
      const st = r.status as string;
      if (filterStatus !== 'All' && st !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (r.tt || '').toLowerCase().includes(q) || (r.no || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, showArchived, filterLevel, filterStatus, search]);

  const byLevel = useMemo(() => {
    const groups: Record<string, DMLRecord[]> = { L1: [], L2: [], L3: [], L4: [] };
    filtered.forEach((r) => {
      const lvl = r.hierarchyLevel || (r as any).lv || 'L4';
      if (lvl in groups) groups[lvl].push(r);
      else groups['L4'].push(r);
    });
    return groups;
  }, [filtered]);

  const selected = useMemo(() => records.find((r) => r.id === selectedId), [records, selectedId]);

  const toggleLevel = (lvl: string) => setExpandedLevels((p) => ({ ...p, [lvl]: !p[lvl] }));

  const needsReview = records.filter((r) => {
    if (!r.reviewDate) return false;
    const rd = parseDDMMYYYY(r.reviewDate);
    if (!rd) return false;
    const soon = new Date(); soon.setMonth(soon.getMonth() + 2);
    return rd < soon && r.status === 'Published';
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteRecord(id);
      useAuditStore.getState().log('delete', 'DML', id, 'Deleted document');
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleArchive = (id: string, isArchived: boolean) => {
    updateRecord(id, { isArchived: !isArchived });
    useAuditStore.getState().log('update', 'DML', id, isArchived ? 'Unarchived document' : 'Archived document');
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left panel */}
      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Document Manager</h2>
          <button onClick={() => { setEditingRecord(null); setShowForm(true); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add Doc
          </button>
        </div>

        {needsReview.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠ {needsReview.length} document(s) due for review</div>
            {needsReview.slice(0, 3).map((r) => (
              <div key={r.id} className="text-xs text-amber-600 dark:text-amber-400">{r.tt || r.no} — due {r.reviewDate}</div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DML..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <option>All</option><option>L1</option><option>L2</option><option>L3</option><option>L4</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <option>All</option><option>Draft</option><option>UnderReview</option><option>Approved</option><option>Published</option><option>Obsolete</option>
            </select>
            <button onClick={() => setShowArchived((v) => !v)}
              className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-slate-100 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}>
              {showArchived ? 'Hide Archived' : 'Archived'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {(['L1', 'L2', 'L3', 'L4'] as const).map((lvl) => (
            <div key={lvl}>
              <button
                onClick={() => toggleLevel(lvl)}
                className="w-full flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 py-1"
              >
                {expandedLevels[lvl] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${LEVEL_COLOR[lvl]}`}>{lvl}</span>
                <span>{LEVEL_LABEL[lvl]}</span>
                <span className="ml-auto text-slate-400">({byLevel[lvl].length})</span>
              </button>
              {expandedLevels[lvl] && (
                <div className="ml-4 space-y-1">
                  {byLevel[lvl].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                        selectedId === r.id
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{r.tt || r.no}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.no && <span className="text-slate-400 text-xs">{r.no} {r.isArchived ? '(Archived)' : ''}</span>}
                    </button>
                  ))}
                  {byLevel[lvl].length === 0 && (
                    <p className="text-xs text-slate-400 px-3 py-1">No documents.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a document to view details</p>
            <p className="text-xs mt-1 opacity-60">or use the filters to narrow the list</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selected.tt || selected.no}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${LEVEL_COLOR[selected.hierarchyLevel || (selected as any).lv || 'L4']}`}>
                      {selected.hierarchyLevel || (selected as any).lv || 'L4'}
                    </span>
                    <span className="text-xs text-slate-500">{selected.no}</span>
                    {selected.rv && <span className="text-xs text-slate-500">Rev. {selected.rv}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.status as string}
                    onChange={(e) => updateRecord(selected.id, { status: e.target.value as DMLRecordStatus })}
                    className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {['Draft', 'UnderReview', 'Approved', 'Published', 'Obsolete'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => { setEditingRecord(selected); setShowForm(true); }} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleArchive(selected.id, !!selected.isArchived)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-600 rounded-full"><Archive className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(selected.id)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-600 rounded-full"><Trash className="w-4 h-4"/></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Department</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selected.dept || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">ISO Clause</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selected.cl || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Review Date</span>
                  <input
                    type="date"
                    value={selected.reviewDate || ''}
                    onChange={(e) => updateRecord(selected.id, { reviewDate: e.target.value })}
                    className="mt-0.5 text-sm border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Document Owner</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{(selected as any).owner || (selected as any).docOwner || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Lifecycle Actions</h4>
              <div className="flex gap-2 flex-wrap">
                {(selected.status as string) === 'Draft' && (
                  <button
                    onClick={() => updateRecord(selected.id, { status: 'UnderReview' as DMLRecordStatus })}
                    className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Submit for Review →
                  </button>
                )}
                {(selected.status as string) === 'UnderReview' && (
                  <>
                    <button
                      onClick={() => updateRecord(selected.id, { status: 'Approved' as DMLRecordStatus })}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Approve →
                    </button>
                    <button
                      onClick={() => updateRecord(selected.id, { status: 'Draft' as DMLRecordStatus })}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      ← Reject
                    </button>
                  </>
                )}
                {(selected.status as string) === 'Approved' && (
                  <button
                    onClick={() => updateRecord(selected.id, { status: 'Published' as DMLRecordStatus })}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Publish →
                  </button>
                )}
                {(selected.status as string) === 'Published' && (
                  <>
                    <button
                      onClick={() => updateRecord(selected.id, { status: 'UnderReview' as DMLRecordStatus })}
                      className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      Trigger Periodic Review
                    </button>
                    <button
                      onClick={() => {
                        // Create a new revision
                        const newRevMatch = selected.rv ? selected.rv.match(/\d+/) : null;
                        const newRev = newRevMatch ? `Rev ${String(parseInt(newRevMatch[0], 10) + 1).padStart(2, '0')}` : 'Rev 01';
                        addRecord({
                          ...selected,
                          id: undefined,
                          rv: newRev,
                          status: 'Draft',
                          reviewDate: new Date().toISOString().split('T')[0],
                        } as any);
                        updateRecord(selected.id, { status: 'Obsolete', isArchived: true });
                        useAuditStore.getState().log('create', 'DML', 'new', 'Created new revision for ' + selected.no);
                        setShowForm(false);
                      }}
                      className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      Create New Revision
                    </button>
                    <button
                      onClick={() => updateRecord(selected.id, { status: 'Obsolete' as DMLRecordStatus })}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Mark Obsolete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showForm && (
        <DMLFormModal 
          record={editingRecord}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSubmit={(data) => {
            if (editingRecord) {
              updateRecord(editingRecord.id, data);
              useAuditStore.getState().log('update', 'DML', editingRecord.id, 'Updated document');
            } else {
              const newRecord = addRecord({...data, status: 'Draft'} as any);
              useAuditStore.getState().log('create', 'DML', newRecord.id, 'Created document');
            }
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

function DMLFormModal({ record, onClose, onSubmit }: { record: any, onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    no: record?.no || '', tt: record?.tt || '', hierarchyLevel: record?.hierarchyLevel || 'L4',
    cl: record?.cl || '', rv: record?.rv || 'Rev 00', reviewDate: record?.reviewDate || '', 
    dept: record?.dept || '', ret: record?.ret || '', nt: record?.nt || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-850 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 animate-modal-enter">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">{record ? 'Edit' : 'New'} Document</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Document No *</label>
              <input
                placeholder="e.g. DOC-001"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.no}
                onChange={e => setFormData({...formData, no: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
              <input
                placeholder="e.g. Quality Manual"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.tt}
                onChange={e => setFormData({...formData, tt: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hierarchy Level *</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.hierarchyLevel}
                onChange={e => setFormData({...formData, hierarchyLevel: e.target.value})}
                required
              >
                <option value="L1">L1 - Quality Manual</option>
                <option value="L2">L2 - Procedures</option>
                <option value="L3">L3 - Work Instructions</option>
                <option value="L4">L4 - Forms & Records</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ISO Clause</label>
              <input
                placeholder="e.g. 7.5"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.cl}
                onChange={e => setFormData({...formData, cl: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Revision</label>
              <input
                placeholder="e.g. Rev 00"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.rv}
                onChange={e => setFormData({...formData, rv: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Review Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.reviewDate}
                onChange={e => setFormData({...formData, reviewDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
              <input
                placeholder="e.g. Quality Assurance"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.dept}
                onChange={e => setFormData({...formData, dept: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Retention Period</label>
              <input
                placeholder="e.g. 3 Years"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.ret}
                onChange={e => setFormData({...formData, ret: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              placeholder="Additional remarks or change description..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              rows={3}
              value={formData.nt}
              onChange={e => setFormData({...formData, nt: e.target.value})}
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
              {record ? 'Save Changes' : 'Create Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
