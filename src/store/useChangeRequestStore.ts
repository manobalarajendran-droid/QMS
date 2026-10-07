import { createRecordStore, type BaseRecord } from './createRecordStore';

/**
 * Change requests. Every change that touches a controlled document, a process,
 * a product, a system or a supplier gets a numbered record here, moves through
 * the six stages below, and is checked afterwards to see whether it worked.
 *
 * Not to be confused with `useChangeControlStore`, which only holds the
 * settings that decide when an approval is required. This one holds the
 * actual change records.
 *
 * The fields match what the change-control screens already expected from the
 * old server, so those screens only had to swap where the data comes from -
 * nothing about how they look changed.
 */

export const CC_STATUS_ORDER = [
  'initiated',
  'assessment',
  'approval',
  'implementation',
  'verification',
  'closed',
] as const;

export type ChangeRequestStatus = (typeof CC_STATUS_ORDER)[number];

export interface ChangeTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string | null;
  status: 'open' | 'completed' | 'overdue';
  completedAt?: string;
}

export interface ChangeRequestRecord extends BaseRecord {
  changeNumber: string;
  title: string;
  type: string;
  description: string;
  justification: string;
  riskLevel: string;
  status: ChangeRequestStatus;
  impactAssessment: string | null;
  affectedDocuments: string[];
  affectedTraining: string[];
  affectedValidation: string[];
  tasks: ChangeTask[];
  effectivenessVerified: boolean;
  effectivenessCheckDate?: string;
  raisedBy?: string;
}

/** CC-2026-001, counting only the numbers issued in the current year. */
export function nextChangeNumber(records: ChangeRequestRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `CC-${year}-`;
  const highest = records
    .map((r) => r.changeNumber)
    .filter((n): n is string => typeof n === 'string' && n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

/** A task counts as overdue once its due date has passed and it is still open. */
export function withOverdueFlags(tasks: ChangeTask[]): ChangeTask[] {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.map((task) =>
    task.status !== 'completed' && task.dueDate && task.dueDate < today
      ? { ...task, status: 'overdue' as const }
      : task,
  );
}

export const useChangeRequestStore = createRecordStore<ChangeRequestRecord>(
  'pta-qms:change-requests',
  'cc',
);
