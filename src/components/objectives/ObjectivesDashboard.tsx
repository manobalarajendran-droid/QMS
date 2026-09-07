import { useState, useMemo } from "react";
import { useObjectivesStore } from "../../store/useObjectivesStore";
import { useClientIntakeStore } from "../../store/useClientIntakeStore";
import type { ObjectiveRecord, ObjectiveRecordStatus } from "../../store/useObjectivesStore";
import { Target, Plus, ChevronDown, ChevronRight, Users, TrendingUp } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";


export function ObjectivesDashboard() {
  const records = useObjectivesStore((s) => s.records);
  const addRecord = useObjectivesStore((s) => s.addRecord);
  const updateRecord = useObjectivesStore((s) => s.updateRecord);
  const intakeRecords = useClientIntakeStore((s) => s.records);

  const [view, setView] = useState<"tree" | "leaderboard">("tree");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [filterYear, setFilterYear] = useState("All");
  
  const [showForm, setShowForm] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveRecord | null>(null);

  const years = useMemo(() => {
    const yrs = new Set(records.map((r) => r.yr || "").filter(Boolean));
    return ["All", ...Array.from(yrs).sort().reverse()];
  }, [records]);

  const active = useMemo(() =>
    records.filter((r) => filterYear === "All" || r.yr === filterYear),
    [records, filterYear]
  );

  const corporate = useMemo(() => active.filter((r) => !r.parentId), [active]);
  const contributions = useMemo(() => active.filter((r) => !!r.parentId), [active]);

  const deptGroups = useMemo(() => {
    const g: Record<string, ObjectiveRecord[]> = {};
    corporate.forEach((r) => {
      const dept = r.dept || "General";
      if (!g[dept]) g[dept] = [];
      g[dept].push(r);
    });
    return g;
  }, [corporate]);

  const avgPct = corporate.length
    ? Math.round(corporate.reduce((s, r) => s + (r.pct || 0), 0) / corporate.length)
    : 0;

  const emergencies = useMemo(
    () => intakeRecords.filter((r) => r.intakeType === "Emergency"),
    [intakeRecords]
  );
  const avgReactionMins = useMemo(() => {
    const withAck = emergencies.filter((r) => r.timeAcknowledged);
    if (!withAck.length) return null;
    const total = withAck.reduce((s, r) => {
      const diff = new Date(r.timeAcknowledged!).getTime() - new Date(r.timeLogged).getTime();
      return s + diff / 60000;
    }, 0);
    return Math.round(total / withAck.length);
  }, [emergencies]);

  const leaderboard = useMemo(() => {
    const scores: Record<string, { total: number; completed: number; avgPct: number }> = {};
    corporate.forEach((r) => {
      const dept = r.dept || "General";
      if (!scores[dept]) scores[dept] = { total: 0, completed: 0, avgPct: 0 };
      scores[dept].total += 1;
      if (r.status === "Completed") scores[dept].completed += 1;
      scores[dept].avgPct = Math.round(
        (scores[dept].avgPct * (scores[dept].total - 1) + (r.pct || 0)) / scores[dept].total
      );
    });
    return Object.entries(scores).sort(([, a], [, b]) => b.avgPct - a.avgPct);
  }, [corporate]);

  const toggleDept = (dept: string) =>
    setExpandedDepts((p) => ({ ...p, [dept]: !p[dept] }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{corporate.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total Objectives</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{corporate.filter((r) => r.status === "Completed").length}</div>
          <div className="text-xs text-slate-500 mt-1">Completed</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{avgPct}%</div>
          <div className="text-xs text-slate-500 mt-1">Avg Achievement</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{avgReactionMins !== null ? avgReactionMins + "m" : "New"}</div>
          <div className="text-xs text-slate-500 mt-1">Avg Emergency Reaction</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {(["tree", "leaderboard"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={"px-3 py-1.5 text-sm font-medium transition-colors " + (view === v ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750")}>
              {v === "tree" ? "Strategic Tree" : "Leaderboard"}
            </button>
          ))}
        </div>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <button onClick={() => { setSelectedObjective(null); setShowForm(true); }}
          className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 ml-auto">
          <Plus className="w-4 h-4" /> New Objective
        </button>
      </div>

      {view === "tree" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(deptGroups).map(([dept, objs]) => (
            <div key={dept} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => toggleDept(dept)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" /> {dept}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  {objs.filter((o) => o.status === "Completed").length}/{objs.length} done
                  {expandedDepts[dept] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              </button>
              {expandedDepts[dept] && (
                <div className="p-3 space-y-3">
                  {objs.map((obj) => {
                    const deptContribs = contributions.filter((c) => c.parentId === obj.id);
                    return (
                      <div key={obj.id} onClick={() => { setSelectedObjective(obj); setShowForm(true); }} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{obj.desc}</div>
                            <div className="text-xs text-slate-500 mt-0.5">KPI: {obj.kpi}</div>
                          </div>
                          <StatusBadge status={obj.status} />
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>{obj.owner}</span><span>{obj.pct || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: (obj.pct || 0) + "%" }} />
                          </div>
                        </div>
                        {deptContribs.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-indigo-200 space-y-1">
                            {deptContribs.map((c) => (
                              <div key={c.id} className="text-xs text-slate-500 flex items-center gap-1">
                                <Users className="w-3 h-3" /> {c.dept}: {c.desc}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Transparency Leaderboard
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {leaderboard.map(([dept, s], i) => (
              <div key={dept} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " + (i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600")}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{dept}</div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1">
                    <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: s.avgPct + "%" }} />
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold text-slate-800 dark:text-white">{s.avgPct}%</div>
                  <div className="text-xs text-slate-400">{s.completed}/{s.total} done</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <ObjectiveFormModal
          record={selectedObjective}
          onClose={() => { setShowForm(false); setSelectedObjective(null); }}
          onSubmit={(data) => {
            if (selectedObjective) {
              updateRecord(selectedObjective.id, data);
            } else {
              addRecord({ ...data, status: "Not Started", pct: 0 });
            }
            setShowForm(false);
            setSelectedObjective(null);
          }}
        />
      )}
    </div>
  );
}

function ObjectiveFormModal({ record, onClose, onSubmit }: { record: ObjectiveRecord | null, onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    yr: record?.yr || String(new Date().getFullYear()),
    dept: record?.dept || "Management",
    ref: record?.ref || "NEW",
    desc: record?.desc || "",
    kpi: record?.kpi || "",
    owner: record?.owner || "",
    deadline: record?.deadline || "",
    status: record?.status || "Not Started",
    pct: record?.pct || 0,
    remarks: record?.remarks || ""
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-modal-enter">
        <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{record ? 'Edit Objective' : 'New Objective'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Year *</label>
            <input 
              placeholder="e.g. 2026" 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.yr} 
              onChange={e => setFormData({...formData, yr: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Department *</label>
            <input 
              placeholder="e.g. Management" 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.dept} 
              onChange={e => setFormData({...formData, dept: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Ref No</label>
            <input 
              placeholder="e.g. CORP-01" 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.ref} 
              onChange={e => setFormData({...formData, ref: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Owner</label>
            <input 
              placeholder="e.g. GM" 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.owner} 
              onChange={e => setFormData({...formData, owner: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Objective Description</label>
            <textarea 
              placeholder="Enter detailed objective description..." 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              rows={2} 
              value={formData.desc} 
              onChange={e => setFormData({...formData, desc: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">KPI / Target</label>
            <textarea 
              placeholder="Measurable KPI or target metric..." 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              rows={2} 
              value={formData.kpi} 
              onChange={e => setFormData({...formData, kpi: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value as ObjectiveRecordStatus})} 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option>Not Started</option>
              <option>Ongoing</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Pending Submission</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Achievement (%)</label>
            <input 
              type="number" 
              min={0} 
              max={100} 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.pct} 
              onChange={e => setFormData({...formData, pct: Number(e.target.value)})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Deadline</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              value={formData.deadline} 
              onChange={e => setFormData({...formData, deadline: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Remarks / Updates</label>
            <textarea 
              placeholder="Action notes or latest remarks..." 
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
              rows={2} 
              value={formData.remarks} 
              onChange={e => setFormData({...formData, remarks: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Save Objective</button>
        </div>
        </form>
      </div>
    </div>
  );
}


