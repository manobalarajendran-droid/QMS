import { useState } from "react";
import { useClientIntakeStore } from "../../store/useClientIntakeStore";
import type { ClientIntakeRecord } from "../../store/useClientIntakeStore";
import { Phone, AlertTriangle, MessageSquare, Plus, Clock, CheckCircle2, Users } from "lucide-react";

const TYPE_ICON: Record<string, React.ReactNode> = {
  Emergency: <AlertTriangle className="w-4 h-4 text-red-500" />,
  Complaint:  <MessageSquare className="w-4 h-4 text-amber-500" />,
  Inquiry:    <Phone className="w-4 h-4 text-blue-500" />,
};

import { StatusBadge } from "../shared/StatusBadge";

const DEPTS = ["Operations", "Planning", "HSE", "Inspection/QC", "Management", "Maintenance", "Fabrication"];

export function UnifiedVoC() {
  const records = useClientIntakeStore((s) => s.records);
  const addRecord = useClientIntakeStore((s) => s.addRecord);
  const updateRecord = useClientIntakeStore((s) => s.updateRecord);
  const updateStatus = useClientIntakeStore((s) => s.updateStatus);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", intakeType: "Complaint" as ClientIntakeRecord["intakeType"], receivedBy: "", routedToDept: "Operations" });

  const active = records.filter((r) => r.status !== "Closed");
  const closed = records.filter((r) => r.status === "Closed");

  const reactionTimes = records
    .filter((r) => r.timeAcknowledged)
    .map((r) => (new Date(r.timeAcknowledged!).getTime() - new Date(r.timeLogged).getTime()) / 60000);
  const avgReaction = reactionTimes.length ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : null;

  const mobilizationTimes = records
    .filter((r) => r.timeMobilized && r.timeAcknowledged)
    .map((r) => (new Date(r.timeMobilized!).getTime() - new Date(r.timeAcknowledged!).getTime()) / 60000);
  const avgMobilization = mobilizationTimes.length ? Math.round(mobilizationTimes.reduce((a, b) => a + b, 0) / mobilizationTimes.length) : null;

  const handleSubmit = () => {
    if (!form.title) return;
    addRecord({ ...form, timeLogged: new Date().toISOString(), status: "Logged" });
    setForm({ title: "", description: "", intakeType: "Complaint", receivedBy: "", routedToDept: "Operations" });
    setShowForm(false);
  };

  const acknowledge = (r: ClientIntakeRecord) =>
    updateRecord(r.id, { timeAcknowledged: new Date().toISOString(), status: "Acknowledged" });

  const mobilize = (r: ClientIntakeRecord) =>
    updateRecord(r.id, { timeMobilized: new Date().toISOString(), status: "Mobilized" });

  const close = (r: ClientIntakeRecord) => updateStatus(r.id, "Closed");

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{active.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active Issues</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{closed.length}</div>
          <div className="text-xs text-slate-500 mt-1">Resolved</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 text-center">
          <div className={"text-2xl font-bold " + (avgReaction !== null && avgReaction > 240 ? "text-red-600" : "text-amber-600")}>
            {avgReaction !== null ? avgReaction + "m" : "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">Avg Reaction Time</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 text-center">
          <div className={"text-2xl font-bold " + (avgMobilization !== null && avgMobilization > 240 ? "text-red-600" : "text-cyan-600")}>
            {avgMobilization !== null ? avgMobilization + "m" : "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">Avg Mobilization</div>
        </div>
      </div>

      {/* New intake form */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Phone className="w-4 h-4 text-indigo-500" /> Unified Client Intake
        </h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Log New
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm animate-fade-in">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">New Client Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type *</label>
              <select
                value={form.intakeType}
                onChange={(e) => setForm((f) => ({ ...f, intakeType: e.target.value as ClientIntakeRecord["intakeType"] }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option>Complaint</option><option>Emergency</option><option>Inquiry</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Route to Department *</label>
              <select
                value={form.routedToDept}
                onChange={(e) => setForm((f) => ({ ...f, routedToDept: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                {DEPTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issue Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Issue Title *"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Description..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Received By</label>
            <input
              value={form.receivedBy}
              onChange={(e) => setForm((f) => ({ ...f, receivedBy: e.target.value }))}
              placeholder="Received by (your name)"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-750">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Records list */}
      <div className="space-y-2">
        {records.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No records yet. Log the first one above.</p>}
        {records.map((r) => {
          const reactionMins = r.timeAcknowledged
            ? Math.round((new Date(r.timeAcknowledged).getTime() - new Date(r.timeLogged).getTime()) / 60000)
            : null;
          const mobilizationMins = r.timeMobilized && r.timeAcknowledged
            ? Math.round((new Date(r.timeMobilized).getTime() - new Date(r.timeAcknowledged).getTime()) / 60000)
            : null;
          return (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {TYPE_ICON[r.intakeType]}
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {r.routedToDept} · {r.receivedBy}
                      <Clock className="w-3 h-3 ml-2" /> {new Date(r.timeLogged).toLocaleString()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.description && <p className="text-xs text-slate-500 mt-2">{r.description}</p>}

              {/* Timing KPIs */}
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                {reactionMins !== null && (
                  <span className={"flex items-center gap-1 " + (reactionMins > 240 ? "text-red-500" : "text-green-600")}>
                    <Clock className="w-3 h-3" /> Reaction: {reactionMins}m
                  </span>
                )}
                {mobilizationMins !== null && (
                  <span className={"flex items-center gap-1 " + (mobilizationMins > 240 ? "text-red-500" : "text-green-600")}>
                    <Clock className="w-3 h-3" /> Mobilization: {mobilizationMins}m
                  </span>
                )}
              </div>

              {/* Actions */}
              {r.status !== "Closed" && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.status === "Logged" && (
                    <button
                      onClick={() => acknowledge(r)}
                      className="text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                    >
                      Acknowledge →
                    </button>
                  )}
                  {r.status === "Acknowledged" && r.intakeType === "Emergency" && (
                    <button
                      onClick={() => mobilize(r)}
                      className="text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
                    >
                      Crew Mobilized →
                    </button>
                  )}
                  {(r.status === "Mobilized" || (r.status === "Acknowledged" && r.intakeType !== "Emergency")) && (
                    <button
                      onClick={() => close(r)}
                      className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />Close
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
