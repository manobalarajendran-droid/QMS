import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { CalibStatus, CalibRecord, CalibStateHistoryEntry } from '../types';

export type { CalibStatus, CalibRecord } from '../types';

// ── Overdue & Lifecycle Helpers ──────────────────────────────────────────────

export function getCalibDaysRemaining(nextCalibDate?: string): number | null {
  if (!nextCalibDate) return null;
  const target = new Date(nextCalibDate);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
}

function computeStatusFromDate(nextCalibDate?: string): CalibStatus {
  const days = getCalibDaysRemaining(nextCalibDate);
  if (days === null) return 'Valid';
  if (days < 0) return 'Overdue';
  if (days <= 30) return 'Due';
  return 'Valid';
}

export function computeCalibStatus(record: CalibRecord): CalibStatus {
  if (record.status === 'Out of Service' || record.status === 'Scrapped') {
    return record.status;
  }
  const days = getCalibDaysRemaining(record.nextCalibDate);
  if (days === null) return record.status;
  if (days < 0) return 'Overdue';
  if (days <= 30) return 'Due';
  return 'Valid';
}

export function isCalibOverdue(record: CalibRecord): boolean {
  if (record.status === 'Out of Service' || record.status === 'Scrapped') return false;
  const days = getCalibDaysRemaining(record.nextCalibDate);
  return days !== null && days < 0;
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface CalibStoreState {
  records: CalibRecord[];
  addRecord: (data: Omit<CalibRecord, 'id' | 'createdAt' | 'updatedAt'>) => CalibRecord;
  updateRecord: (id: string, data: Partial<Omit<CalibRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: CalibStatus, notes?: string) => void;
  transitionStatus: (
    id: string,
    to: CalibStatus,
    by: string,
    reason: string,
    kind: CalibStateHistoryEntry['kind']
  ) => void;
  reportOutOfTolerance: (id: string, by: string, reason: string) => void;
  verifyReturnToService: (id: string, by: string, reason: string) => void;
  scrapInstrument: (id: string, by: string, reason: string) => void;
  reopenFromScrap: (id: string, by: string, reason: string) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: CalibRecord[]) => void;
}

const SEED_DATA: CalibRecord[] = [
  {
    id: 'cal-1',
    equipNo: 'PTA-QC-CAL-01',
    equipName: 'Digital Pressure Gauge',
    manufacturer: 'Fluke',
    serialNo: 'FLK-99812',
    location: 'QC Lab',
    freqMonths: 12,
    lastCalibDate: new Date(Date.now() - 300 * 86400000).toISOString().split('T')[0],
    nextCalibDate: new Date(Date.now() + 65 * 86400000).toISOString().split('T')[0],
    status: 'Valid',
    certificateNo: 'CERT-2025-881',
    notes: 'Standard reference gauge.',
    calibrationAgency: 'Saudi Standards Metrology (SASO)',
    calibratedBy: 'Eng. Mansoor',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useCalibStore = create<CalibStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const now = new Date().toISOString();
        const id = generateRecordId('cal');
        const record: CalibRecord = {
          ...data,
          id,
          status: data.status || 'Valid',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ records: [...s.records, record] }));
        useAuditStore.getState().log('create', 'calibration', id, undefined, JSON.stringify(record));
        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const updated: CalibRecord = {
          ...existing,
          ...data,
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? updated : r)),
        }));
        useAuditStore.getState().log(
          'update',
          'calibration',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, notes) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, status, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log(
          'status_change',
          'calibration',
          id,
          existing.status,
          status,
          notes
        );
      },

      transitionStatus: (id, to, by, reason, kind) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const from = computeCalibStatus(existing);
        const entry: CalibStateHistoryEntry = { from, to, by, at: now, reason, kind };
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? { ...r, status: to, updatedAt: now, stateHistory: [...(r.stateHistory ?? []), entry] }
              : r
          ),
        }));
        useAuditStore.getState().log('status_change', 'calibration', id, from, to, reason);
      },

      reportOutOfTolerance: (id, by, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        get().transitionStatus(id, 'Out of Service', by, reason, 'forward');
      },

      verifyReturnToService: (id, by, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const to = computeStatusFromDate(existing.nextCalibDate);
        const entry: CalibStateHistoryEntry = { from: existing.status, to, by, at: now, reason, kind: 'verify' };
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: to,
                  approvedBy: by,
                  approvalDate: now,
                  approvalComments: reason,
                  updatedAt: now,
                  stateHistory: [...(r.stateHistory ?? []), entry],
                }
              : r
          ),
        }));
        useAuditStore.getState().log('status_change', 'calibration', id, existing.status, to, reason);
      },

      scrapInstrument: (id, by, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const entry: CalibStateHistoryEntry = {
          from: existing.status,
          to: 'Scrapped',
          by,
          at: now,
          reason,
          kind: 'forward',
        };
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'Scrapped',
                  rejectedBy: by,
                  rejectionDate: now,
                  rejectionReason: reason,
                  updatedAt: now,
                  stateHistory: [...(r.stateHistory ?? []), entry],
                }
              : r
          ),
        }));
        useAuditStore.getState().log('status_change', 'calibration', id, existing.status, 'Scrapped', reason);
      },

      reopenFromScrap: (id, by, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const entry: CalibStateHistoryEntry = {
          from: existing.status,
          to: 'Out of Service',
          by,
          at: now,
          reason,
          kind: 'reopen',
        };
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'Out of Service',
                  rejectedBy: undefined,
                  rejectionDate: undefined,
                  rejectionReason: undefined,
                  updatedAt: now,
                  stateHistory: [...(r.stateHistory ?? []), entry],
                }
              : r
          ),
        }));
        useAuditStore.getState().log('status_change', 'calibration', id, existing.status, 'Out of Service', reason);
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'calibration', id, JSON.stringify(existing), undefined);
      },

      archiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, isArchived: true, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log(
          'archive',
          'calibration',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'Archived calibration record'
        );
      },

      unarchiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, isArchived: false, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log(
          'unarchive',
          'calibration',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Unarchived calibration record'
        );
      },

      toggleArchive: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        if (existing.isArchived) {
          get().unarchiveRecord(id);
        } else {
          get().archiveRecord(id);
        }
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'calibration',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useCalibStore' }
  )
);
