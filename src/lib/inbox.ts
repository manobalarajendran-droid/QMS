import { useMemo } from 'react';
import type { ViewTab } from '../types';
import { useNCRStore } from '../store/useNCRStore';
import { useTaskStore } from '../store/useTaskStore';
import { useMRMStore } from '../store/useMRMStore';
import { useTUVStore } from '../store/useTUVStore';
import { useDCRStore } from '../store/useDCRStore';
import { useChangeRequestStore } from '../store/useChangeRequestStore';
import { useClientIntakeStore } from '../store/useClientIntakeStore';
import { useCSIStore } from '../store/useCSIStore';
import { useObjectivesStore } from '../store/useObjectivesStore';
import { useAuditProgrammeStore } from '../store/useAuditProgrammeStore';
import { useDMLStore } from '../store/useDMLStore';
import { useWorkflowStore } from '../store/useWorkflowStore';

/**
 * One list of open work, built from every record type. Today, Approvals,
 * the menu badges and the search box all read from here, so they always
 * agree with each other.
 */

export type InboxKind =
  | 'ncr' | 'task' | 'mrm' | 'mrm_action' | 'tuv' | 'dcr' | 'change'
  | 'intake' | 'csi' | 'objective' | 'audit' | 'document' | 'workflow';

export const KIND_LABEL: Record<InboxKind, string> = {
  ncr: 'NCR',
  task: 'Task',
  mrm: 'Management review',
  mrm_action: 'Review action',
  tuv: 'TUV finding',
  dcr: 'Document change',
  change: 'Change request',
  intake: 'Client intake',
  csi: 'CSI follow-up',
  objective: 'Objective',
  audit: 'Audit',
  document: 'Document',
  workflow: 'Approval step',
};

export interface InboxItem {
  key: string;
  kind: InboxKind;
  screen: ViewTab;
  recordId: string;
  ref: string;
  title: string;
  owner: string;
  due: string | null;
  status: string;
  needsApproval: boolean;
}

export type DueBucket = 'overdue' | 'week' | 'later' | 'none';

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Which due group an item falls in, counted in whole days from today. */
export function dueBucket(due: string | null, now: Date = new Date()): DueBucket {
  if (!due) return 'none';
  const t = Date.parse(due);
  if (Number.isNaN(t)) return 'none';
  const days = Math.round((dayStart(new Date(t)) - dayStart(now)) / DAY_MS);
  if (days < 0) return 'overdue';
  if (days <= WEEK_DAYS) return 'week';
  return 'later';
}

/** True when the item's owner text names this user. */
export function isMine(item: InboxItem, userName: string | null | undefined): boolean {
  const me = (userName ?? '').trim().toLowerCase();
  if (!me) return false;
  return item.owner.toLowerCase().includes(me);
}

const CLOSED = new Set([
  'closed', 'completed', 'verified', 'approved', 'rejected', 'implemented',
  'achieved', 'not achieved', 'obsolete', 'active', 'published', 'cancelled',
]);

function isOpen(status: string | undefined): boolean {
  return !CLOSED.has((status ?? '').toLowerCase());
}

function earliest(...dates: (string | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

type Make = Omit<InboxItem, 'key'>;
const item = (m: Make): InboxItem => ({ ...m, key: `${m.kind}:${m.recordId}:${m.ref}` });

interface Sources {
  ncr: ReturnType<typeof useNCRStore.getState>['records'];
  task: ReturnType<typeof useTaskStore.getState>['records'];
  mrm: ReturnType<typeof useMRMStore.getState>['records'];
  tuv: ReturnType<typeof useTUVStore.getState>['records'];
  dcr: ReturnType<typeof useDCRStore.getState>['records'];
  change: ReturnType<typeof useChangeRequestStore.getState>['records'];
  intake: ReturnType<typeof useClientIntakeStore.getState>['records'];
  csi: ReturnType<typeof useCSIStore.getState>['records'];
  objective: ReturnType<typeof useObjectivesStore.getState>['records'];
  audit: ReturnType<typeof useAuditProgrammeStore.getState>['records'];
  dml: ReturnType<typeof useDMLStore.getState>['records'];
  workflow: ReturnType<typeof useWorkflowStore.getState>['instances'];
}

const live = <T extends { isArchived?: boolean }>(rows: T[] | undefined): T[] =>
  (rows ?? []).filter((r) => !r.isArchived);

function fromQuality(s: Sources): InboxItem[] {
  const out: InboxItem[] = [];
  for (const r of live(s.ncr)) {
    if (!isOpen(r.status)) continue;
    out.push(item({
      kind: 'ncr', screen: 'deviations', recordId: r.id, ref: r.ref ?? '', title: r.desc ?? '',
      owner: r.assignedTo ?? r.assignedDept ?? r.auditeeDept ?? '',
      due: earliest(r.containmentTargetDate, r.corrTargetDate, r.prevTargetDate, r.slaDeadline),
      status: r.status, needsApproval: r.status === 'Verification',
    }));
  }
  for (const r of live(s.tuv)) {
    if (!isOpen(r.status)) continue;
    out.push(item({
      kind: 'tuv', screen: 'tuv_tracker', recordId: r.id, ref: r.num ?? '', title: r.desc ?? '',
      owner: r.owner ?? '', due: earliest(r.due), status: r.status, needsApproval: false,
    }));
  }
  for (const r of live(s.audit)) {
    if (r.status === 'Completed') continue;
    out.push(item({
      kind: 'audit', screen: 'audit_records', recordId: r.id, ref: r.ref ?? '',
      title: [r.dep, r.aud].filter(Boolean).join(' · '), owner: r.aud ?? '',
      due: earliest(r.status === 'Follow-up' ? r.followUpDate : r.dt), status: r.status,
      needsApproval: false,
    }));
  }
  for (const r of live(s.intake)) {
    if (!isOpen(r.status)) continue;
    out.push(item({
      kind: 'intake', screen: 'voc', recordId: r.id, ref: r.intakeType, title: r.title,
      owner: [r.assignedTo, r.correctiveOwner].filter(Boolean).join(', '),
      due: earliest(r.dueDate, r.correctiveTargetDate), status: r.status, needsApproval: false,
    }));
  }
  for (const r of live(s.csi)) {
    const f = r.followUp;
    if (!f || !isOpen(f.status)) continue;
    out.push(item({
      kind: 'csi', screen: 'pms', recordId: r.id, ref: r.projectName ?? '',
      title: f.correctiveAction || 'Follow up on survey score', owner: f.owner ?? f.assignedDept ?? '',
      due: earliest(f.dueDate), status: f.status, needsApproval: false,
    }));
  }
  return out;
}

function fromDocsAndLeadership(s: Sources): InboxItem[] {
  const out: InboxItem[] = [];
  for (const r of live(s.dcr)) {
    if (!isOpen(r.status)) continue;
    out.push(item({
      kind: 'dcr', screen: 'dcr_workflow', recordId: r.id, ref: r.dcrNo, title: r.title,
      owner: r.assignedTo ?? '', due: earliest(r.dueDate), status: r.status,
      needsApproval: r.status !== 'Draft',
    }));
  }
  for (const r of s.change ?? []) {
    if (r.status === 'closed') continue;
    out.push(item({
      kind: 'change', screen: 'change_control', recordId: r.id, ref: r.changeNumber, title: r.title,
      owner: r.tasks.filter((t) => t.status !== 'completed').map((t) => t.assignee).join(', '),
      due: earliest(...r.tasks.filter((t) => t.status !== 'completed').map((t) => t.dueDate ?? undefined)),
      status: r.status, needsApproval: r.status === 'approval',
    }));
  }
  for (const r of live(s.dml)) {
    if (!isOpen(r.status) || !r.dueDate) continue;
    out.push(item({
      kind: 'document', screen: 'dml_manager', recordId: r.id, ref: r.no ?? '', title: r.tt ?? '',
      owner: r.assignedTo ?? '', due: earliest(r.dueDate), status: r.status,
      needsApproval: r.status === 'Under Review' || r.status === 'UnderReview',
    }));
  }
  for (const r of live(s.mrm)) {
    if (r.status === 'Draft' || r.status === 'Reviewed') {
      out.push(item({
        kind: 'mrm', screen: 'mrm_manager', recordId: r.id, ref: r.ref ?? '',
        title: `Management review ${r.meetingDate}`, owner: '', due: null, status: r.status,
        needsApproval: r.status === 'Reviewed',
      }));
    }
    for (const a of r.actionItems ?? []) {
      if (a.status === 'Closed') continue;
      out.push(item({
        kind: 'mrm_action', screen: 'mrm_manager', recordId: r.id, ref: r.ref ?? '',
        title: a.description, owner: a.owner, due: earliest(a.dueDate), status: a.status,
        needsApproval: false,
      }));
    }
  }
  for (const r of live(s.objective)) {
    if (!isOpen(r.status)) continue;
    out.push(item({
      kind: 'objective', screen: 'objectives', recordId: r.id, ref: r.ref ?? '', title: r.desc ?? '',
      owner: r.owner ?? '', due: earliest(r.deadline), status: r.status, needsApproval: false,
    }));
  }
  return out;
}

function fromTasksAndFlows(s: Sources): InboxItem[] {
  const out: InboxItem[] = [];
  for (const t of s.task ?? []) {
    if (t.status === 'completed') continue;
    out.push(item({
      kind: 'task', screen: 'tasks', recordId: t.id, ref: '', title: t.title, owner: t.assigneeName,
      due: earliest(t.dueDate), status: t.status, needsApproval: false,
    }));
  }
  for (const w of s.workflow ?? []) {
    if (w.status !== 'active') continue;
    const delegatedTo = (w.delegations ?? []).map((d) => d.toUserName ?? '').join(', ');
    out.push(item({
      kind: 'workflow', screen: 'workflows', recordId: w.id, ref: w.entityType,
      title: w.entityLabel ?? `${w.entityType} ${w.entityId}`, owner: delegatedTo,
      due: null, status: `Step ${w.currentStepIndex + 1}`, needsApproval: true,
    }));
  }
  return out;
}

function sortByDue(a: InboxItem, b: InboxItem): number {
  const da = a.due ? Date.parse(a.due) : Number.POSITIVE_INFINITY;
  const db = b.due ? Date.parse(b.due) : Number.POSITIVE_INFINITY;
  return da - db;
}

export function buildInbox(s: Sources): InboxItem[] {
  return [...fromQuality(s), ...fromDocsAndLeadership(s), ...fromTasksAndFlows(s)].sort(sortByDue);
}

/** Every open item across the app, soonest due first. */
export function useInbox(): InboxItem[] {
  const ncr = useNCRStore((x) => x.records);
  const task = useTaskStore((x) => x.records);
  const mrm = useMRMStore((x) => x.records);
  const tuv = useTUVStore((x) => x.records);
  const dcr = useDCRStore((x) => x.records);
  const change = useChangeRequestStore((x) => x.records);
  const intake = useClientIntakeStore((x) => x.records);
  const csi = useCSIStore((x) => x.records);
  const objective = useObjectivesStore((x) => x.records);
  const audit = useAuditProgrammeStore((x) => x.records);
  const dml = useDMLStore((x) => x.records);
  const workflow = useWorkflowStore((x) => x.instances);
  return useMemo(
    () => buildInbox({ ncr, task, mrm, tuv, dcr, change, intake, csi, objective, audit, dml, workflow }),
    [ncr, task, mrm, tuv, dcr, change, intake, csi, objective, audit, dml, workflow],
  );
}

export interface InboxCounts {
  overdue: number;
  week: number;
  approvals: number;
}

export function countInbox(items: InboxItem[], now: Date = new Date()): InboxCounts {
  let overdue = 0;
  let week = 0;
  let approvals = 0;
  for (const i of items) {
    const b = dueBucket(i.due, now);
    if (b === 'overdue') overdue += 1;
    else if (b === 'week') week += 1;
    if (i.needsApproval) approvals += 1;
  }
  return { overdue, week, approvals };
}
