import { createRecordStore, type BaseRecord } from './createRecordStore';
import type { TaskPriority, TaskStatus } from '../types';

/**
 * Quality tasks - the small pieces of work that come out of an NCR, an audit
 * finding, a change request or a management review, and that somebody has to
 * finish by a date.
 *
 * Before this store, tasks were kept in a raw localStorage array written by a
 * panel that nothing rendered, so there was no way to create one and no way
 * for anyone else to see one. `migrateLegacyTasks()` below lifts anything left
 * in that old array into this store, once, so nothing is lost.
 */

export interface TaskRecord extends BaseRecord {
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** What the task came out of, e.g. 'ncr' or 'audit'. Optional. */
  entityType?: string;
  entityId?: string;
  createdBy: string;
  completedAt?: string;
}

export const useTaskStore = createRecordStore<TaskRecord>('pta-qms:task-records', 'task');

const LEGACY_KEY = 'pta-qms:tasks';

/**
 * Move anything from the old raw array into the store, then clear it so this
 * only ever happens once. Safe to call on every start.
 */
export function migrateLegacyTasks(): void {
  let legacy: unknown;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    legacy = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const store = useTaskStore.getState();
  const known = new Set(store.records.map((r) => r.id));
  const now = new Date().toISOString();

  const carried = (legacy as Record<string, unknown>[])
    .filter((t) => typeof t?.id === 'string' && !known.has(t.id as string))
    .map((t) => ({
      ...t,
      createdAt: (t.createdAt as string) || now,
      updatedAt: now,
    })) as TaskRecord[];

  if (carried.length > 0) {
    store.setRecords([...carried, ...store.records]);
  }
  localStorage.removeItem(LEGACY_KEY);
}

/** Past its due date and still not finished. */
export function isOverdue(task: Pick<TaskRecord, 'status' | 'dueDate'>): boolean {
  if (task.status === 'completed') return false;
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
}
