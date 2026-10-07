import { useMemo, useState } from "react";
import { useClientIntakeStore } from "../../store/useClientIntakeStore";
import type {
  ClientIntakeRecord,
  ClientIntakeRecordStatus,
  ClientIntakeSeverity,
  ClientIntakeReporterType,
} from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/useAuthStore";
import { StatusBadge } from "../shared/StatusBadge";
import { EvidencePanel } from "../evidence/EvidencePanel";
import { CommentThread } from "../shared/CommentThread";
import {
  Phone,
  AlertTriangle,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  User as UserIcon,
  Paperclip,
  Printer,
  Search,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TYPE_ICON: Record<string, React.ReactNode> = {
  Emergency: <AlertTriangle className="w-4 h-4 text-danger-text" />,
  Complaint: <MessageSquare className="w-4 h-4 text-warning-text" />,
  Inquiry: <Phone className="w-4 h-4 text-info-text" />,
};

const DEPTS = ["Operations", "Planning", "HSE", "Inspection/QC", "Management", "Maintenance", "Fabrication"];

/**
 * Severity and "who raised it" came across from the old Complaints screen,
 * which this one replaced. They are only asked for on a Complaint - an
 * Emergency is already the top of the scale, and an Inquiry is not a fault.
 */
const SEVERITIES: ClientIntakeSeverity[] = ["minor", "major", "critical"];

const REPORTER_TYPES: { value: ClientIntakeReporterType; label: string }[] = [
  { value: "customer", label: "Client" },
  { value: "internal", label: "Internal staff" },
  { value: "regulatory", label: "Regulator / third party" },
  { value: "field", label: "Site / field" },
];

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
  unrated: "#94a3b8",
};

const SEVERITY_CHIP: Record<ClientIntakeSeverity, string> = {
  minor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all";

function DeptSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
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

function slaHours(intakeType: ClientIntakeRecord["intakeType"]): number {
  return intakeType === "Emergency" ? 4 : intakeType === "Complaint" ? 24 : 48;
}

function defaultDueDate(intakeType: ClientIntakeRecord["intakeType"], fromISO: string): string {
  return new Date(new Date(fromISO).getTime() + slaHours(intakeType) * 3600000).toISOString().slice(0, 10);
}

function isVoCOverdue(r: ClientIntakeRecord): boolean {
  if (!r.dueDate || r.status === "Closed") return false;
  return new Date(r.dueDate).getTime() < Date.now();
}

function previousStatus(r: ClientIntakeRecord): ClientIntakeRecordStatus | null {
  if (r.status === "Acknowledged") return "Logged";
  if (r.status === "Mobilized") return "Acknowledged";
  return null;
}

export function UnifiedVoC() {
  const { user } = useAuth();
  const isMR = user?.role === "admin" || user?.role === "qa_manager";

  const records = useClientIntakeStore((s) => s.records);
  const addRecord = useClientIntakeStore((s) => s.addRecord);
  const updateRecord = useClientIntakeStore((s) => s.updateRecord);
  const transitionStatus = useClientIntakeStore((s) => s.transitionStatus);
  const toggleArchive = useClientIntakeStore((s) => s.toggleArchive);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    intakeType: "Complaint" as ClientIntakeRecord["intakeType"],
    receivedBy: "",
    routedToDept: "Operations",
    severity: "major" as ClientIntakeSeverity,
    reporterType: "customer" as ClientIntakeReporterType,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ClientIntakeRecordStatus>("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "dueSoonest">("newest");

  const active = records.filter((r) => r.status !== "Closed");
  const closed = records.filter((r) => r.status === "Closed");
  const overdueCount = records.filter(isVoCOverdue).length;

  const reactionTimes = records
    .filter((r) => r.timeAcknowledged)
    .map((r) => (new Date(r.timeAcknowledged!).getTime() - new Date(r.timeLogged).getTime()) / 60000);
  const avgReaction = reactionTimes.length ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : null;

  const mobilizationTimes = records
    .filter((r) => r.timeMobilized && r.timeAcknowledged)
    .map((r) => (new Date(r.timeMobilized!).getTime() - new Date(r.timeAcknowledged!).getTime()) / 60000);
  const avgMobilization = mobilizationTimes.length ? Math.round(mobilizationTimes.reduce((a, b) => a + b, 0) / mobilizationTimes.length) : null;

  const availableDepts = useMemo(() => {
    const extra = records.map((r) => r.routedToDept).filter((d) => !DEPTS.includes(d));
    return [...DEPTS, ...Array.from(new Set(extra))];
  }, [records]);

  const availableAssignees = useMemo(
    () => Array.from(new Set(records.map((r) => r.assignedTo).filter((a): a is string => !!a))),
    [records]
  );

  /**
   * The three trend charts the old Complaints screen drew, worked out here off
   * the same records. "By product" made no sense for a services company, so it
   * is by department instead - that is what a supervisor can actually act on.
   */
  const trend = useMemo(() => {
    const live = records.filter((r) => !r.isArchived);

    const months = new Map<string, number>();
    live.forEach((r) => {
      const m = (r.timeLogged || "").slice(0, 7);
      if (m) months.set(m, (months.get(m) ?? 0) + 1);
    });
    const byMonth = [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const sevs = new Map<string, number>();
    live
      .filter((r) => r.intakeType === "Complaint")
      .forEach((r) => {
        const k = r.severity ?? "unrated";
        sevs.set(k, (sevs.get(k) ?? 0) + 1);
      });
    const bySeverity = [...sevs.entries()].map(([key, value]) => ({
      name: key === "unrated" ? "Not rated" : key[0].toUpperCase() + key.slice(1),
      value,
      fill: SEVERITY_COLORS[key] ?? SEVERITY_COLORS.unrated,
    }));

    const depts = new Map<string, number>();
    live.forEach((r) => depts.set(r.routedToDept, (depts.get(r.routedToDept) ?? 0) + 1));
    const byDept = [...depts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dept, count]) => ({ dept, count }));

    // Days from logging it to closing it. The closing date comes from the
    // state history where there is one, so an unrelated later edit cannot
    // quietly change the number.
    const spans = live
      .filter((r) => r.status === "Closed")
      .map((r) => {
        const closedAt =
          [...(r.stateHistory ?? [])].reverse().find((h) => h.to === "Closed")?.at ?? r.updatedAt;
        return (new Date(closedAt).getTime() - new Date(r.timeLogged).getTime()) / 86400000;
      })
      .filter((d) => Number.isFinite(d) && d >= 0);
    const mttr = spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : null;

    return { byMonth, bySeverity, byDept, mttr, complaintCount: live.filter((r) => r.intakeType === "Complaint").length };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => (showArchived ? true : !r.isArchived));
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    if (deptFilter !== "All") list = list.filter((r) => r.routedToDept === deptFilter);
    if (assigneeFilter !== "All") list = list.filter((r) => r.assignedTo === assigneeFilter);
    if (severityFilter !== "All") list = list.filter((r) => (r.severity ?? "unrated") === severityFilter);
    if (overdueOnly) list = list.filter(isVoCOverdue);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.receivedBy.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.timeLogged).getTime() - new Date(b.timeLogged).getTime();
      if (sortBy === "dueSoonest") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.timeLogged).getTime() - new Date(a.timeLogged).getTime();
    });
  }, [records, showArchived, statusFilter, deptFilter, assigneeFilter, severityFilter, overdueOnly, search, sortBy]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Issue title is required.";
    if (!form.receivedBy.trim()) errs.receivedBy = "Received by is required.";
    if (!form.routedToDept.trim()) errs.routedToDept = "Route to department is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const timeLogged = new Date().toISOString();
    const { severity, reporterType, ...common } = form;
    addRecord({
      ...common,
      timeLogged,
      status: "Logged",
      dueDate: defaultDueDate(form.intakeType, timeLogged),
      // A rating and a source only mean something on a complaint.
      ...(form.intakeType === "Complaint" ? { severity, reporterType } : {}),
    });
    setForm({
      title: "", description: "", intakeType: "Complaint", receivedBy: "",
      routedToDept: "Operations", severity: "major", reporterType: "customer",
    });
    setFormErrors({});
    setShowForm(false);
  };

  const acknowledge = (r: ClientIntakeRecord) =>
    transitionStatus(r.id, "Acknowledged", user?.name || "System", "Acknowledged via quick action", "forward");

  const mobilize = (r: ClientIntakeRecord) =>
    transitionStatus(r.id, "Mobilized", user?.name || "System", "Crew mobilized via quick action", "forward");

  return (
    <div className="space-y-4 pb-8">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">Client Intake / VoC</h1>
          <p className="mt-0.5 text-[11px] text-text-tertiary">Unified voice of the client — complaints, emergencies, inquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTrends((v) => !v)}
            className={"inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-xl border shadow-sm transition-colors " +
              (showTrends
                ? "bg-surface-hover text-text-primary border-border"
                : "bg-surface text-text-secondary border-border/60 hover:bg-surface-hover")}>
            <BarChart3 className="w-3.5 h-3.5" /> Trends
          </button>
          <button onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold bg-accent text-accent-fg px-4 py-2 rounded-xl hover:bg-accent-hover shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log New
          </button>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
          <div className="text-[26px] font-semibold leading-none tabular-nums text-danger-text">{active.length}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Active Issues</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
          <div className="text-[26px] font-semibold leading-none tabular-nums text-success-text">{closed.length}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Resolved</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
          <div className={"text-[26px] font-semibold leading-none tabular-nums " + (avgReaction !== null && avgReaction > 240 ? "text-danger-text" : "text-warning-text")}>
            {avgReaction !== null ? avgReaction + "m" : "—"}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Avg Reaction</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
          <div className={"text-[26px] font-semibold leading-none tabular-nums " + (avgMobilization !== null && avgMobilization > 240 ? "text-danger-text" : "text-accent")}>
            {avgMobilization !== null ? avgMobilization + "m" : "—"}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Avg Mobilization</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
          <div className={`text-[26px] font-semibold leading-none tabular-nums ${overdueCount > 0 ? "text-danger-text" : "text-text-tertiary"}`}>{overdueCount}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Overdue</div>
        </div>
      </div>

      {showTrends && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5">
              <h3 className="text-[12.5px] font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-accent" /> Intakes by month
              </h3>
              {trend.byMonth.length === 0 ? (
                <p className="text-[12.5px] text-text-tertiary py-10 text-center">Nothing logged yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5">
              <h3 className="text-[12.5px] font-semibold text-text-primary mb-3">Complaints by severity</h3>
              {trend.bySeverity.length === 0 ? (
                <p className="text-[12.5px] text-text-tertiary py-10 text-center">No complaints logged yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={trend.bySeverity} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                      {trend.bySeverity.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5">
              <h3 className="text-[12.5px] font-semibold text-text-primary mb-3">Intakes by department</h3>
              {trend.byDept.length === 0 ? (
                <p className="text-[12.5px] text-text-tertiary py-10 text-center">Nothing logged yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend.byDept}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="dept" tick={{ fontSize: 10 }} stroke="var(--color-text-tertiary)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
              <div className="text-[26px] font-semibold leading-none tabular-nums text-text-primary">
                {trend.mttr !== null ? trend.mttr + "d" : "—"}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Avg Days to Close</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 text-center">
              <div className="text-[26px] font-semibold leading-none tabular-nums text-warning-text">{trend.complaintCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mt-1.5">Complaints</div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-border/60 bg-surface shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-text-primary">New Client Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Type *</label>
              <select
                value={form.intakeType}
                onChange={(e) => setForm((f) => ({ ...f, intakeType: e.target.value as ClientIntakeRecord["intakeType"] }))}
                className={inputCls}
              >
                <option>Complaint</option><option>Emergency</option><option>Inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Route to Department *</label>
              <DeptSelect value={form.routedToDept} onChange={(v) => setForm((f) => ({ ...f, routedToDept: v }))} />
              {formErrors.routedToDept && <p className="text-xs text-danger-text mt-1">{formErrors.routedToDept}</p>}
            </div>
          </div>
          {form.intakeType === "Complaint" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Severity</label>
                <div className="flex gap-2">
                  {SEVERITIES.map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, severity: sev }))}
                      className={"flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize " +
                        (form.severity === sev
                          ? SEVERITY_CHIP[sev] + " border-transparent"
                          : "bg-surface text-text-secondary border-border hover:bg-surface-hover")}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Raised By</label>
                <select
                  className={inputCls}
                  value={form.reporterType}
                  onChange={(e) => setForm((f) => ({ ...f, reporterType: e.target.value as ClientIntakeReporterType }))}
                >
                  {REPORTER_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Issue Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Issue Title *"
              className={inputCls}
            />
            {formErrors.title && <p className="text-xs text-danger-text mt-1">{formErrors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Description..."
              className={inputCls + " resize-none"}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Received By</label>
            <input
              value={form.receivedBy}
              onChange={(e) => setForm((f) => ({ ...f, receivedBy: e.target.value }))}
              placeholder="Received by (your name)"
              className={inputCls}
            />
            {formErrors.receivedBy && <p className="text-xs text-danger-text mt-1">{formErrors.receivedBy}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              onClick={() => { setShowForm(false); setFormErrors({}); }}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-fg rounded-lg shadow-sm transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-border/60 bg-surface shadow-sm px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search intakes..."
            className="pl-8 pr-3 py-1.5 text-[12.5px] border border-border/60 rounded-lg bg-surface-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-[12.5px] bg-surface-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-text-secondary">
          <option value="All">All Statuses</option>
          <option value="Logged">Logged</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Mobilized">Mobilized</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-[12.5px] bg-surface-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-text-secondary">
          <option value="All">All Departments</option>
          {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="text-[12.5px] bg-surface-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-text-secondary">
          <option value="All">All Assignees</option>
          {availableAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="text-[12.5px] bg-surface-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-text-secondary">
          <option value="All">All Severities</option>
          {SEVERITIES.map((sev) => <option key={sev} value={sev} className="capitalize">{sev[0].toUpperCase() + sev.slice(1)}</option>)}
          <option value="unrated">Not rated</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-[12.5px] bg-surface-secondary border border-border/60 rounded-lg px-2.5 py-1.5 text-text-secondary">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="dueSoonest">Due soonest</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary cursor-pointer ml-auto">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-border" />
          Overdue only
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border" />
          Archived
        </label>
      </div>

      {/* Records list */}
      <div className="space-y-2">
        {filteredRecords.length === 0 && <p className="text-sm text-text-tertiary text-center py-5">No records match the current filters.</p>}
        {filteredRecords.map((r) => (
          <VoCRecordCard
            key={r.id}
            record={r}
            isMR={isMR}
            onAcknowledge={() => acknowledge(r)}
            onMobilize={() => mobilize(r)}
            onUpdateRecord={(data) => updateRecord(r.id, data)}
            onTransition={(to, reason, kind) => transitionStatus(r.id, to, user?.name || "System", reason, kind)}
            onToggleArchive={() => toggleArchive(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VoCRecordCard({
  record: r,
  isMR,
  onAcknowledge,
  onMobilize,
  onUpdateRecord,
  onTransition,
  onToggleArchive,
}: {
  record: ClientIntakeRecord;
  isMR: boolean;
  onAcknowledge: () => void;
  onMobilize: () => void;
  onUpdateRecord: (data: Partial<ClientIntakeRecord>) => void;
  onTransition: (to: ClientIntakeRecordStatus, reason: string, kind: "forward" | "reject" | "reopen" | "verify") => void;
  onToggleArchive: () => void;
}) {
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [gate, setGate] = useState<null | { to: ClientIntakeRecordStatus; kind: "reject" | "reopen" | "verify"; label: string }>(null);
  const [gateReason, setGateReason] = useState("");

  const projectId = r.id;
  const overdue = isVoCOverdue(r);

  const reactionMins = r.timeAcknowledged
    ? Math.round((new Date(r.timeAcknowledged).getTime() - new Date(r.timeLogged).getTime()) / 60000)
    : null;
  const mobilizationMins = r.timeMobilized && r.timeAcknowledged
    ? Math.round((new Date(r.timeMobilized).getTime() - new Date(r.timeAcknowledged).getTime()) / 60000)
    : null;

  const prevStatus = previousStatus(r);

  function confirmGate() {
    if (!gate || !gateReason.trim()) return;
    onTransition(gate.to, gateReason.trim(), gate.kind);
    setGate(null);
    setGateReason("");
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {TYPE_ICON[r.intakeType]}
          <div>
            <div className="text-sm font-medium text-text-primary">{r.title}</div>
            <div className="text-xs text-text-tertiary mt-0.5 flex items-center gap-2 flex-wrap">
              <Users className="w-3 h-3" /> {r.routedToDept} · {r.receivedBy}
              {r.reporterType && (
                <span>· raised by {REPORTER_TYPES.find((rt) => rt.value === r.reporterType)?.label ?? r.reporterType}</span>
              )}
              <Clock className="w-3 h-3 ml-2" /> {new Date(r.timeLogged).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-subtle text-danger-text">OVERDUE</span>}
          {r.intakeType === "Complaint" && r.severity && (
            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide " + SEVERITY_CHIP[r.severity]}>
              {r.severity}
            </span>
          )}
          <StatusBadge status={r.status} />
        </div>
      </div>
      {r.description && <p className="text-xs text-text-secondary mt-2">{r.description}</p>}

      {/* Ownership */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
        <div>
          <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1 flex items-center gap-1">
            <UserIcon className="w-3 h-3" /> Assigned To
          </label>
          <UserSelect value={r.assignedTo ?? ""} onChange={(v) => onUpdateRecord({ assignedTo: v })} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Due Date</label>
          <input
            type="date"
            value={r.dueDate ?? ""}
            onChange={(e) => onUpdateRecord({ dueDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Timing KPIs */}
      <div className="flex gap-4 mt-2 text-xs text-text-tertiary">
        {reactionMins !== null && (
          <span className={"flex items-center gap-1 " + (reactionMins > 240 ? "text-danger-text" : "text-success-text")}>
            <Clock className="w-3 h-3" /> Reaction: {reactionMins}m
          </span>
        )}
        {mobilizationMins !== null && (
          <span className={"flex items-center gap-1 " + (mobilizationMins > 240 ? "text-danger-text" : "text-success-text")}>
            <Clock className="w-3 h-3" /> Mobilization: {mobilizationMins}m
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mt-3 flex-wrap items-center">
        {r.status === "Logged" && (
          <button
            onClick={onAcknowledge}
            className="text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
          >
            Acknowledge →
          </button>
        )}
        {r.status === "Acknowledged" && r.intakeType === "Emergency" && (
          <button
            onClick={onMobilize}
            className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
          >
            Crew Mobilized →
          </button>
        )}
        {isMR && prevStatus && (
          <button
            onClick={() => setGate({ to: prevStatus, kind: "reject", label: `Return to ${prevStatus}` })}
            className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            ↩ Return to {prevStatus}
          </button>
        )}
        {isMR && (r.status === "Mobilized" || (r.status === "Acknowledged" && r.intakeType !== "Emergency")) && (
          <button
            onClick={() => setGate({ to: "Closed", kind: "verify", label: "Verify & Close" })}
            className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
          >
            <CheckCircle2 className="w-3 h-3 inline mr-1" />Close
          </button>
        )}
        {isMR && r.status === "Closed" && (
          <button
            onClick={() => setGate({ to: "Acknowledged", kind: "reopen", label: "Reopen" })}
            className="text-xs font-medium bg-surface-hover text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            Reopen
          </button>
        )}
        <button onClick={() => setShowActionPlan((v) => !v)} className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1.5">
          Action Plan
        </button>
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
          {r.isArchived ? "Unarchive" : "Archive"}
        </button>
      </div>

      {gate && (
        <div className="mt-3 p-3 bg-surface-secondary rounded-lg border border-border space-y-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Reason for {gate.label.toLowerCase()} (required)
          </label>
          <textarea
            autoFocus
            rows={2}
            value={gateReason}
            onChange={(e) => setGateReason(e.target.value)}
            placeholder="Explain the decision…"
            className={inputCls}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setGate(null); setGateReason(""); }} className="px-3 py-1.5 text-xs text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={confirmGate}
              disabled={!gateReason.trim()}
              className="px-3 py-1.5 text-xs text-accent-fg bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {showActionPlan && (
        <div className="mt-3 p-3 bg-surface-secondary rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-3">
          {r.intakeType === "Complaint" && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Severity</label>
                <select
                  className={inputCls}
                  value={r.severity ?? ""}
                  onChange={(e) => onUpdateRecord({ severity: (e.target.value || undefined) as ClientIntakeSeverity | undefined })}
                >
                  <option value="">— Not rated —</option>
                  {SEVERITIES.map((sev) => <option key={sev} value={sev}>{sev[0].toUpperCase() + sev.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Raised By</label>
                <select
                  className={inputCls}
                  value={r.reporterType ?? ""}
                  onChange={(e) => onUpdateRecord({ reporterType: (e.target.value || undefined) as ClientIntakeReporterType | undefined })}
                >
                  <option value="">— Not recorded —</option>
                  {REPORTER_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Root Cause</label>
                <textarea
                  rows={2}
                  value={r.rootCause ?? ""}
                  onChange={(e) => onUpdateRecord({ rootCause: e.target.value })}
                  placeholder="Why it happened…"
                  className={inputCls}
                />
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Corrective / Preventive Action</label>
            <textarea
              rows={2}
              value={r.correctiveAction ?? ""}
              onChange={(e) => onUpdateRecord({ correctiveAction: e.target.value })}
              placeholder="Describe the action taken to prevent recurrence…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Owner</label>
            <UserSelect value={r.correctiveOwner ?? ""} onChange={(v) => onUpdateRecord({ correctiveOwner: v })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Target Date</label>
            <input type="date" className={inputCls} value={r.correctiveTargetDate ?? ""} onChange={(e) => onUpdateRecord({ correctiveTargetDate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Completion Date</label>
            <input type="date" className={inputCls} value={r.correctiveCompletionDate ?? ""} onChange={(e) => onUpdateRecord({ correctiveCompletionDate: e.target.value })} />
          </div>
        </div>
      )}

      {r.stateHistory && r.stateHistory.length > 0 && (
        <div className="mt-3 space-y-1">
          {[...r.stateHistory].reverse().map((h, i) => (
            <div key={i} className="text-[11px] bg-surface-secondary border border-border rounded-lg px-2.5 py-1.5">
              <span className="font-semibold text-text-primary">{h.from} → {h.to}</span>
              <span className="ml-2 text-text-tertiary">by {h.by}: {h.reason}</span>
            </div>
          ))}
        </div>
      )}

      {showComments && (
        <div className="mt-3 pt-3 border-t border-border">
          <CommentThread entityType="voc" entityId={r.id} projectId={projectId} />
        </div>
      )}

      {showEvidence && (
        <EvidencePanel entityType="voc" entityId={r.id} projectId={projectId} open={showEvidence} onClose={() => setShowEvidence(false)} />
      )}
    </div>
  );
}
