import { useState, useMemo } from "react";
import { useObjectivesStore } from "../../store/useObjectivesStore";
import { useClientIntakeStore } from "../../store/useClientIntakeStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useAuth } from "../../hooks/useAuth";
import type { ObjectiveRecord, ObjectiveRecordStatus } from "../../store/useObjectivesStore";
import { Target, Plus, ChevronDown, ChevronRight, Users, TrendingUp, Clock, User as UserIcon, Paperclip, MessageSquare, Printer, Search, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { EvidencePanel } from "../evidence/EvidencePanel";
import { CommentThread } from "../shared/CommentThread";

const DEPTS = ["IED / QAQC", "Projects", "OSD", "IT", "Facility", "Procurement", "Store", "P&E", "HR"];

const inputCls = "w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent transition-colors";

function DeptSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
      {value && !DEPTS.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

function UserSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const authUsers = useAuthStore((s) => s.users);
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Unassigned —</option>
      {authUsers.map((u) => (
        <option key={u.id} value={u.displayName}>{u.displayName}</option>
      ))}
      {value && !authUsers.some((u) => u.displayName === value) && <option value={value}>{value}</option>}
    </select>
  );
}

function isObjectiveOverdue(r: ObjectiveRecord): boolean {
  if (!r.deadline) return false;
  if (r.status === "Achieved" || r.status === "Completed" || r.status === "Not Achieved") return false;
  return new Date(r.deadline).getTime() < Date.now();
}

type Stage = "notstarted" | "active" | "paused" | "done" | "failed";

function stageOf(status: ObjectiveRecordStatus): Stage {
  if (status === "Not Started") return "notstarted";
  if (status === "On Hold" || status === "Delayed") return "paused";
  if (status === "Completed" || status === "Achieved") return "done";
  if (status === "Not Achieved") return "failed";
  return "active"; // In Progress, Ongoing, Pending Submission
}

export function ObjectivesDashboard() {
  const { user } = useAuth();
  const isMR = user?.role === "admin" || user?.role === "qa_manager";

  const records = useObjectivesStore((s) => s.records);
  const addRecord = useObjectivesStore((s) => s.addRecord);
  const updateRecord = useObjectivesStore((s) => s.updateRecord);
  const transitionStatus = useObjectivesStore((s) => s.transitionStatus);
  const toggleArchive = useObjectivesStore((s) => s.toggleArchive);
  const intakeRecords = useClientIntakeStore((s) => s.records);

  const [view, setView] = useState<"tree" | "leaderboard">("tree");
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [filterYear, setFilterYear] = useState("All");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ObjectiveRecordStatus>("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "deadline" | "pct">("default");

  const [showForm, setShowForm] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveRecord | null>(null);

  const years = useMemo(() => {
    const yrs = new Set(records.map((r) => r.yr || "").filter(Boolean));
    return ["All", ...Array.from(yrs).sort().reverse()];
  }, [records]);

  const byYear = useMemo(
    () => records.filter((r) => filterYear === "All" || r.yr === filterYear),
    [records, filterYear]
  );
  const nonArchived = useMemo(() => byYear.filter((r) => showArchived || !r.isArchived), [byYear, showArchived]);
  const overdueCount = useMemo(() => nonArchived.filter(isObjectiveOverdue).length, [nonArchived]);

  const availableDepts = useMemo(() => {
    const extra = records.map((r) => r.dept || "").filter((d) => d && !DEPTS.includes(d));
    return [...DEPTS, ...Array.from(new Set(extra))];
  }, [records]);

  const availableOwners = useMemo(
    () => Array.from(new Set(records.map((r) => r.owner).filter((o): o is string => !!o))),
    [records]
  );

  const filtered = useMemo(() => {
    let list = nonArchived;
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    if (deptFilter !== "All") list = list.filter((r) => r.dept === deptFilter);
    if (ownerFilter !== "All") list = list.filter((r) => r.owner === ownerFilter);
    if (overdueOnly) list = list.filter(isObjectiveOverdue);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.desc || "").toLowerCase().includes(q) ||
        (r.kpi || "").toLowerCase().includes(q) ||
        (r.ref || "").toLowerCase().includes(q) ||
        (r.objId || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [nonArchived, statusFilter, deptFilter, ownerFilter, overdueOnly, search]);

  const sortObjs = (objs: ObjectiveRecord[]) =>
    [...objs].sort((a, b) => {
      if (sortBy === "deadline") {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === "pct") return (b.pct || 0) - (a.pct || 0);
      return 0;
    });

  const corporate = useMemo(() => filtered.filter((r) => !r.parentId), [filtered]);
  const contributions = useMemo(() => filtered.filter((r) => !!r.parentId), [filtered]);

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
      if (r.status === "Completed" || r.status === "Achieved") scores[dept].completed += 1;
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{corporate.length}</div>
          <div className="text-xs text-text-tertiary mt-1">Total Objectives</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{corporate.filter((r) => r.status === "Completed" || r.status === "Achieved").length}</div>
          <div className="text-xs text-text-tertiary mt-1">Completed</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{avgPct}%</div>
          <div className="text-xs text-text-tertiary mt-1">Avg Achievement</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className={"text-2xl font-bold " + (overdueCount > 0 ? "text-danger" : "text-text-tertiary")}>{overdueCount}</div>
          <div className="text-xs text-text-tertiary mt-1">Overdue</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{avgReactionMins !== null ? avgReactionMins + "m" : "New"}</div>
          <div className="text-xs text-text-tertiary mt-1">Avg Emergency Reaction</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["tree", "leaderboard"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={"px-3 py-1.5 text-sm font-medium transition-colors " + (view === v ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-hover")}>
              {v === "tree" ? "Strategic Tree" : "Leaderboard"}
            </button>
          ))}
        </div>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="text-sm border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <button onClick={() => { setSelectedObjective(null); setShowForm(true); }}
          className="flex items-center gap-1 text-sm bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-hover ml-auto">
          <Plus className="w-4 h-4" /> New Objective
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search objectives..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Statuses</option>
          <option value="Not Started">Not Started records</option>
          <option value="In Progress">In Progress records</option>
          <option value="Ongoing">Ongoing records</option>
          <option value="Pending Submission">Pending Submission records</option>
          <option value="On Hold">On Hold records</option>
          <option value="Delayed">Delayed records</option>
          <option value="Completed">Completed records</option>
          <option value="Achieved">Achieved records</option>
          <option value="Not Achieved">Not Achieved records</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Departments</option>
          {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="All">All Owners</option>
          {availableOwners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="default">Default order</option>
          <option value="deadline">Deadline soonest</option>
          <option value="pct">Highest achievement</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
          Overdue only
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
          Show Archived
        </label>
      </div>

      {view === "tree" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(deptGroups).map(([dept, objs]) => (
            <div key={dept} className="bg-surface rounded-xl border border-border overflow-hidden">
              <button onClick={() => toggleDept(dept)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
                <span className="font-semibold text-text-primary flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" /> {dept}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-tertiary">
                  {objs.filter((o) => o.status === "Completed" || o.status === "Achieved").length}/{objs.length} done
                  {expandedDepts[dept] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              </button>
              {expandedDepts[dept] && (
                <div className="p-3 space-y-3">
                  {sortObjs(objs).map((obj) => {
                    const deptContribs = contributions.filter((c) => c.parentId === obj.id);
                    const overdue = isObjectiveOverdue(obj);
                    return (
                      <div key={obj.id} onClick={() => { setSelectedObjective(obj); setShowForm(true); }} className="border border-border rounded-lg p-3 hover:border-accent cursor-pointer transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-text-primary">{obj.desc}</div>
                            <div className="text-xs text-text-tertiary mt-0.5">KPI: {obj.kpi}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
                            <StatusBadge status={obj.status} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-text-tertiary mb-1">
                            <span>{obj.owner}</span><span>{obj.pct || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-secondary rounded-full">
                            <div className="h-1.5 bg-accent rounded-full" style={{ width: (obj.pct || 0) + "%" }} />
                          </div>
                        </div>
                        {deptContribs.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-accent/30 space-y-1">
                            {deptContribs.map((c) => (
                              <div key={c.id} className="text-xs text-text-tertiary flex items-center gap-1">
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
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface-secondary">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" /> Transparency Leaderboard
            </h3>
          </div>
          <div className="divide-y divide-border">
            {leaderboard.map(([dept, s], i) => (
              <div key={dept} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-hover transition-colors">
                <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " + (i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-surface-secondary text-text-secondary")}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{dept}</div>
                  <div className="h-1.5 bg-surface-secondary rounded-full mt-1">
                    <div className="h-1.5 bg-accent rounded-full" style={{ width: s.avgPct + "%" }} />
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold text-text-primary">{s.avgPct}%</div>
                  <div className="text-xs text-text-tertiary">{s.completed}/{s.total} done</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (() => {
        const liveRecord = selectedObjective ? records.find((r) => r.id === selectedObjective.id) ?? null : null;
        return (
          <ObjectiveModal
            record={liveRecord}
            allCorporate={records.filter((r) => !r.parentId)}
            isMR={isMR}
            onClose={() => { setShowForm(false); setSelectedObjective(null); }}
            onCreate={(data) => { addRecord({ ...data, status: "Not Started", pct: 0 }); setShowForm(false); setSelectedObjective(null); }}
            onUpdate={(data) => liveRecord && updateRecord(liveRecord.id, data)}
            onTransition={(to, reason, kind) => liveRecord && transitionStatus(liveRecord.id, to, user?.name || "System", reason, kind)}
            onToggleArchive={() => liveRecord && toggleArchive(liveRecord.id)}
          />
        );
      })()}
    </div>
  );
}

function ObjectiveModal({
  record,
  allCorporate,
  isMR,
  onClose,
  onCreate,
  onUpdate,
  onTransition,
  onToggleArchive,
}: {
  record: ObjectiveRecord | null;
  allCorporate: ObjectiveRecord[];
  isMR: boolean;
  onClose: () => void;
  onCreate: (data: Omit<ObjectiveRecord, "id" | "createdAt" | "updatedAt" | "status" | "pct">) => void;
  onUpdate: (data: Partial<ObjectiveRecord>) => void;
  onTransition: (to: ObjectiveRecordStatus, reason: string, kind: "forward" | "reject" | "reopen" | "verify") => void;
  onToggleArchive: () => void;
}) {
  const [formData, setFormData] = useState({
    yr: record?.yr || "",
    dept: record?.dept || "",
    ref: record?.ref || "NEW",
    objId: record?.objId || "",
    desc: record?.desc || "",
    kpi: record?.kpi || "",
    owner: record?.owner || "",
    deadline: record?.deadline || "",
    pct: record?.pct || 0,
    actual: record?.actual || "",
    evidence: record?.evidence || "",
    remarks: record?.remarks || "",
    parentId: record?.parentId || "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [gate, setGate] = useState<null | { to: ObjectiveRecordStatus; kind: "reject" | "reopen" | "verify"; label: string }>(null);
  const [gateReason, setGateReason] = useState("");

  const overdue = record ? isObjectiveOverdue(record) : false;
  const stage = record ? stageOf(record.status) : "notstarted";
  const parentOptions = allCorporate.filter((c) => c.id !== record?.id && (!formData.yr || c.yr === formData.yr));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.yr.trim()) errs.yr = "Year is required.";
    if (!formData.dept.trim()) errs.dept = "Department is required.";
    if (!formData.desc.trim()) errs.desc = "Objective description is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (record) {
      onUpdate({ ...formData, parentId: formData.parentId || undefined });
    } else {
      onCreate({ ...formData, parentId: formData.parentId || undefined } as any);
    }
    onClose();
  };

  function confirmGate() {
    if (!gate || !gateReason.trim()) return;
    onTransition(gate.to, gateReason.trim(), gate.kind);
    setGate(null);
    setGateReason("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto animate-modal-enter">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">{record ? "Edit Objective" : "New Objective"}</h3>
          {record && (
            <div className="flex items-center gap-1.5">
              {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger">OVERDUE</span>}
              <StatusBadge status={record.status} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Year *</label>
            <input placeholder="e.g. 2026" className={inputCls} value={formData.yr} onChange={(e) => setFormData({ ...formData, yr: e.target.value })} />
            {formErrors.yr && <p className="text-xs text-danger mt-1">{formErrors.yr}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Department *</label>
            <DeptSelect value={formData.dept} onChange={(v) => setFormData({ ...formData, dept: v })} />
            {formErrors.dept && <p className="text-xs text-danger mt-1">{formErrors.dept}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ref No</label>
            <input placeholder="e.g. CORP-01" className={inputCls} value={formData.ref} onChange={(e) => setFormData({ ...formData, ref: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Objective ID</label>
            <input placeholder="e.g. IED-1" className={inputCls} value={formData.objId} onChange={(e) => setFormData({ ...formData, objId: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> Owner
            </label>
            <UserSelect value={formData.owner} onChange={(v) => setFormData({ ...formData, owner: v })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Parent Objective</label>
            <select className={inputCls} value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}>
              <option value="">— None (Corporate Objective) —</option>
              {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.dept}: {(p.desc || "").slice(0, 40)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Objective Description *</label>
            <textarea placeholder="Enter detailed objective description..." className={inputCls} rows={2} value={formData.desc} onChange={(e) => setFormData({ ...formData, desc: e.target.value })} />
            {formErrors.desc && <p className="text-xs text-danger mt-1">{formErrors.desc}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">KPI / Target</label>
            <textarea placeholder="Measurable KPI or target metric..." className={inputCls} rows={2} value={formData.kpi} onChange={(e) => setFormData({ ...formData, kpi: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Actual / Result</label>
            <textarea placeholder="Actual outcome achieved so far..." className={inputCls} rows={2} value={formData.actual} onChange={(e) => setFormData({ ...formData, actual: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Achievement (%)</label>
            <input type="number" min={0} max={100} className={inputCls} value={formData.pct} onChange={(e) => setFormData({ ...formData, pct: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Deadline
            </label>
            <input type="date" className={inputCls} value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Evidence Notes</label>
            <textarea placeholder="Reference to supporting evidence..." className={inputCls} rows={2} value={formData.evidence} onChange={(e) => setFormData({ ...formData, evidence: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Remarks / Updates</label>
            <textarea placeholder="Action notes or latest remarks..." className={inputCls} rows={2} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
          </div>
        </div>

        {record && (
          <div className="border-t border-border pt-4 mb-4 space-y-3">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">State Machine</label>
            <div className="flex gap-2 flex-wrap items-center">
              {stage === "notstarted" && (
                <button onClick={() => onTransition("In Progress", "Started via quick action", "forward")}
                  className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors">
                  Start Progress →
                </button>
              )}
              {stage === "active" && (
                <>
                  <button onClick={() => onTransition("Delayed", "Marked delayed via quick action", "forward")}
                    className="text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors">
                    Mark Delayed
                  </button>
                  <button onClick={() => onTransition("On Hold", "Put on hold via quick action", "forward")}
                    className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                    Put On Hold
                  </button>
                  {isMR && (
                    <button onClick={() => setGate({ to: "Completed", kind: "verify", label: "Verify & Mark Completed" })}
                      className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />Verify & Complete
                    </button>
                  )}
                  {isMR && (
                    <button onClick={() => setGate({ to: "Not Achieved", kind: "verify", label: "Mark Not Achieved" })}
                      className="text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors">
                      Mark Not Achieved
                    </button>
                  )}
                  {isMR && (
                    <button onClick={() => setGate({ to: "Not Started", kind: "reject", label: "Return to Not Started" })}
                      className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                      ↩ Return to Not Started
                    </button>
                  )}
                </>
              )}
              {stage === "paused" && (
                <>
                  <button onClick={() => onTransition("In Progress", "Resumed via quick action", "forward")}
                    className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors">
                    Resume →
                  </button>
                  {isMR && (
                    <button onClick={() => setGate({ to: "Not Started", kind: "reject", label: "Return to Not Started" })}
                      className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                      ↩ Return to Not Started
                    </button>
                  )}
                </>
              )}
              {(stage === "done" || stage === "failed") && isMR && (
                <button onClick={() => setGate({ to: "In Progress", kind: "reopen", label: "Reopen" })}
                  className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">
                  Reopen
                </button>
              )}
            </div>

            {gate && (
              <div className="p-3 bg-surface-secondary rounded-lg border border-border space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Reason for {gate.label.toLowerCase()} (required)
                </label>
                <textarea autoFocus rows={2} value={gateReason} onChange={(e) => setGateReason(e.target.value)} placeholder="Explain the decision…" className={inputCls} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setGate(null); setGateReason(""); }} className="px-3 py-1.5 text-xs text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={confirmGate} disabled={!gateReason.trim()} className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">Confirm</button>
                </div>
              </div>
            )}

            {(record.approvedBy || record.rejectedBy || record.reviewedBy) && (
              <div className="text-[11px] bg-surface-secondary border border-border rounded-lg p-2.5 space-y-1">
                {record.approvedBy && <div><span className="font-semibold text-text-primary">Verified Completed</span> by {record.approvedBy} on {record.approvalDate && new Date(record.approvalDate).toLocaleString()}: {record.approvalComments}</div>}
                {record.rejectedBy && <div><span className="font-semibold text-text-primary">Marked Not Achieved</span> by {record.rejectedBy} on {record.rejectionDate && new Date(record.rejectionDate).toLocaleString()}: {record.rejectionReason}</div>}
                {record.reviewedBy && <div><span className="font-semibold text-text-primary">Returned</span> by {record.reviewedBy} on {record.reviewDate && new Date(record.reviewDate).toLocaleString()}: {record.reviewComments}</div>}
              </div>
            )}

            {record.stateHistory && record.stateHistory.length > 0 && (
              <div className="space-y-1">
                {[...record.stateHistory].reverse().map((h, i) => (
                  <div key={i} className="text-[11px] bg-surface-secondary border border-border rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold text-text-primary">{h.from} → {h.to}</span>
                    <span className="ml-2 text-text-tertiary">by {h.by}: {h.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {record && (
          <div className="border-t border-border pt-4 mb-4">
            <button onClick={() => setShowActionPlan((v) => !v)} className="text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary">
              {showActionPlan ? "▾" : "▸"} Corrective Action Plan
            </button>
            {showActionPlan && (
              <div className="mt-2 p-3 bg-surface-secondary rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Corrective Action</label>
                  <textarea rows={2} value={record.correctiveAction ?? ""} onChange={(e) => onUpdate({ correctiveAction: e.target.value })} placeholder="Describe the action to get back on track…" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Owner</label>
                  <UserSelect value={record.correctiveOwner ?? ""} onChange={(v) => onUpdate({ correctiveOwner: v })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Target Date</label>
                  <input type="date" className={inputCls} value={record.correctiveTargetDate ?? ""} onChange={(e) => onUpdate({ correctiveTargetDate: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Completion Date</label>
                  <input type="date" className={inputCls} value={record.correctiveCompletionDate ?? ""} onChange={(e) => onUpdate({ correctiveCompletionDate: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        )}

        {record && (
          <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
            <button onClick={() => setShowEvidence(true)} title="Evidence" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={() => setShowComments((v) => !v)} title="Comments" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <MessageSquare className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} title="Print / Export" className="p-1.5 text-text-secondary hover:bg-surface-hover rounded-full transition-colors">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onToggleArchive} className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1.5 ml-auto">
              {record.isArchived ? "Unarchive" : "Archive"}
            </button>
          </div>
        )}

        {record && showComments && (
          <div className="mb-4">
            <CommentThread entityType="objective" entityId={record.id} projectId={record.id} />
          </div>
        )}

        {record && showEvidence && (
          <EvidencePanel entityType="objective" entityId={record.id} projectId={record.id} open={showEvidence} onClose={() => setShowEvidence(false)} />
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-hover text-text-primary transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover shadow-sm transition-colors">Save Objective</button>
        </div>
      </div>
    </div>
  );
}
