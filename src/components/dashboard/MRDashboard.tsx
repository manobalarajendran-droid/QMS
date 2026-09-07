import { useNCRStore } from '../../store/useNCRStore';
import { useTUVStore } from '../../store/useTUVStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { ShieldCheck, CheckCircle, Clock, Info, Target, FileWarning, ArrowUpRight, Minus } from 'lucide-react';
import { useMemo } from 'react';
import { StatusBadge } from '../shared/StatusBadge';

export function MRDashboard() {
  const ncrRecords = useNCRStore((s) => s.records);
  const tuvRecords = useTUVStore((s) => s.records);
  const csiRecords = useCSIStore((s) => s.records);
  const objRecords = useObjectivesStore((s) => s.records);

  const openNCRsList = ncrRecords.filter(r => r.status !== 'Closed');
  const openNCRs = openNCRsList.length;

  const overdueObjectives = useMemo(() => {
    return objRecords.filter(r => {
      if (r.status === 'Completed' || !r.deadline) return false;
      return new Date(r.deadline) < new Date();
    }).length;
  }, [objRecords]);

  const daysToTuv = useMemo(() => {
    const auditDate = new Date('2027-06-30T00:00:00Z');
    const today = new Date();
    const diffTime = auditDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const avgCSI = useMemo(() => {
    if (csiRecords.length === 0) return '0.0';
    const total = csiRecords.reduce((acc, curr) => {
      const num = Number(curr?.score) || 0;
      const normalized = num > 10 ? num / 10 : num;
      return acc + normalized;
    }, 0);
    return (total / csiRecords.length).toFixed(1);
  }, [csiRecords]);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            MR Dashboard (Command Center)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Management Representative Overview & Live Metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Open NCRs */}
        <div className="glass-card rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-red-500 shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Open NCRs</h3>
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"><FileWarning className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{openNCRs}</div>
            <div className="flex items-center text-xs font-medium text-red-600">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +2 this week
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">Non-conformance reports awaiting closure</div>
        </div>

        {/* KPI 2: Overdue Objectives */}
        <div className="glass-card rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-amber-500 shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Overdue Objectives</h3>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><Target className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{overdueObjectives}</div>
            <div className="flex items-center text-xs font-medium text-amber-600">
              <Minus className="w-3 h-3 mr-0.5" /> Unchanged
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">Action required by department heads</div>
        </div>

        {/* KPI 3: Next Audit */}
        <div className="glass-card-accent rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-indigo-500 shadow-lg text-slate-900 dark:text-white">
          <div className="flex items-center justify-between mb-3 opacity-90">
            <h3 className="font-semibold text-sm">Next TÜV Audit</h3>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-white/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20"><Clock className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold font-mono">{daysToTuv > 0 ? daysToTuv : 0}</div>
            <div className="text-sm opacity-80">Days</div>
          </div>
          <div className="text-xs opacity-70 mt-1">Surveillance No. 3 Preparation</div>
        </div>

        {/* KPI 4: Avg CSI */}
        <div className="glass-card rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-emerald-500 shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Average CSI Score</h3>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{avgCSI}</div>
            <div className="flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 8.5 target
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all recent projects</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent NCRs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[400px]">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-slate-500" />
              Recent Open NCRs
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {openNCRsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No open NCRs.</div>
            ) : (
              <ul className="space-y-1">
                {openNCRsList.slice(0, 10).map((r) => (
                  <li key={r.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400 text-sm">{r.ref || r.id}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{r.desc}</div>
                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                      <span>Owner: {r.raisedBy || 'Unassigned'}</span>
                      <span>{r.dt || r.createdAt.slice(0,10)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines & Secretariat Reminders */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-500">
              <h3 className="font-semibold text-amber-700 dark:text-amber-500 text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                MR Secretariat — Action Items
              </h3>
            </div>
            <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
              <ul className="space-y-3">
                <li className="flex gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Review QMS Document Master List for obsolete forms.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Follow up on {overdueObjectives} overdue departmental objectives.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Prepare Management Review Meeting (MRM) slides for next week.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
            <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-500" />
                Upcoming Deadlines (TÜV Recs)
              </h3>
            </div>
            <div className="p-4 flex-1">
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {tuvRecords.filter(r => r.status !== 'Closed').slice(0, 5).map((r, i) => (
                  <li key={r.id} className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium mt-0.5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.num}:</div>
                      <div className="mt-0.5 opacity-90">{r.desc}</div>
                    </div>
                  </li>
                ))}
                {tuvRecords.filter(r => r.status !== 'Closed').length === 0 && (
                  <div className="text-center text-slate-500 py-4">No pending TÜV recommendations.</div>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
