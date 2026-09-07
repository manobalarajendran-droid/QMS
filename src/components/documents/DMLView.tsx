import { useState } from 'react';
import { FileText, Search, Plus, Download } from 'lucide-react';


// Mock data to replicate v12 logic in standalone mode
const mockDml = [
  { no: 'PT-QSP-MR-01', title: 'Management Review Procedure', lv: 'L2', dept: 'MR', status: 'Active', rev: '03' },
  { no: 'PT-QSP-MR-02', title: 'Document Control', lv: 'L2', dept: 'MR', status: 'Active', rev: '04' },
  { no: 'PT-QM-01', title: 'Quality Manual', lv: 'L1', dept: 'MR', status: 'Active', rev: '05' },
  { no: 'FM-DML-01', title: 'Document Master List Form', lv: 'L4', dept: 'MR', status: 'Active', rev: '01' }
];

export function DMLView() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [dept, setDept] = useState('');

  const filteredDocs = mockDml.filter(d => {
    if (search && !d.no.toLowerCase().includes(search.toLowerCase()) && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (level && d.lv !== level) return false;
    if (dept && d.dept !== dept) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Document Master List (DML)
          </h2>
          <p className="text-sm text-slate-500 mt-1">PT-QSP-MR-02 Cl.7.5 · FM/DML/01 · All QMS procedures</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"><Download className="w-4 h-4"/> Export Excel</button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"><Plus className="w-4 h-4"/> Add Document</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap bg-surface p-3 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-tertiary" />
          <input 
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" 
            placeholder="Search doc no, title..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="px-3 py-1.5 text-sm bg-surface text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-36" value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">All Levels</option>
          <option value="L1">L1 — Manual</option>
          <option value="L2">L2 — Procedure</option>
          <option value="L3">L3 — Work Inst</option>
          <option value="L4">L4 — Form/Record</option>
        </select>
        <select className="px-3 py-1.5 text-sm bg-surface text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent w-36" value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All Depts</option>
          <option value="MR">MR</option>
          <option value="QC">QC</option>
          <option value="HR">HR</option>
        </select>
        <button className="inline-flex items-center px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors" onClick={() => { setSearch(''); setLevel(''); setDept(''); }}>Clear</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Doc No</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredDocs.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">{d.no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      d.lv === 'L1' ? 'bg-amber-100 text-amber-800' :
                      d.lv === 'L2' ? 'bg-blue-100 text-blue-800' :
                      d.lv === 'L3' ? 'bg-green-100 text-green-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {d.lv}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.dept}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold uppercase">{d.status}</span>
                  </td>
                  <td className="px-4 py-3">{d.rev}</td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
