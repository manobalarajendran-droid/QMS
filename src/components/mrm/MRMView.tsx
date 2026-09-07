import { useState } from 'react';
import { Landmark, Plus, Download } from 'lucide-react';


const mockMrm = [
  { ref: 'MRM-2025-02', dt: '2025-11-15', chair: 'GM', mr: 'MANOBALA Rajendran', st: 'Completed', ar: 5, ac: 3 },
  { ref: 'MRM-2026-01', dt: '2026-04-30', chair: 'GM', mr: 'MANOBALA Rajendran', st: 'Planned', ar: 0, ac: 0 },
];

const mockActions = [
  { ref: 'ACT-001', desc: 'Update supplier evaluation criteria', mrm: 'MRM-2025-02', cl: '8.4', own: 'Procurement', due: '2026-01-30', st: 'Closed' },
  { ref: 'ACT-002', desc: 'Conduct internal audit refresher training', mrm: 'MRM-2025-02', cl: '7.2', own: 'MR', due: '2026-03-15', st: 'Open' },
];

export function MRMView() {
  const [activeTab, setActiveTab] = useState<'register' | 'actions'>('register');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600" />
            Management Review (MRM)
          </h2>
          <p className="text-sm text-slate-500 mt-1">PT-QSP-MR-01 · ISO Cl.9.3 · Mandatory Inputs tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"><Download className="w-4 h-4"/> Export Excel</button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"><Plus className="w-4 h-4"/> Add MRM</button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'register' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
          onClick={() => setActiveTab('register')}
        >
          MRM Register
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'actions' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
          onClick={() => setActiveTab('actions')}
        >
          Action Tracker
        </button>
      </div>

      {activeTab === 'register' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">MRM Ref</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Chair</th>
                <th className="px-4 py-3">MR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions Raised</th>
                <th className="px-4 py-3">Actions Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockMrm.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">{m.ref}</td>
                  <td className="px-4 py-3">{m.dt}</td>
                  <td className="px-4 py-3">{m.chair}</td>
                  <td className="px-4 py-3">{m.mr}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${m.st === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{m.st}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{m.ar}</td>
                  <td className="px-4 py-3 font-mono">{m.ac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Action Description</th>
                <th className="px-4 py-3">MRM</th>
                <th className="px-4 py-3">ISO Cl.</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockActions.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">{a.ref}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{a.desc}</td>
                  <td className="px-4 py-3 text-slate-500">{a.mrm}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.cl}</td>
                  <td className="px-4 py-3">{a.own}</td>
                  <td className="px-4 py-3">{a.due}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${a.st === 'Closed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{a.st}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
