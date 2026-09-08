import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { SupplierStatus, SupplierEvalRecord, SupplierStateHistoryEntry } from '../types';

export type { SupplierStatus, SupplierEvalRecord, SupplierStateHistoryEntry } from '../types';

export interface SupplierEvalStoreState {
  records: SupplierEvalRecord[];
  addRecord: (data: Omit<SupplierEvalRecord, 'id' | 'createdAt' | 'updatedAt'>) => SupplierEvalRecord;
  updateRecord: (id: string, data: Partial<Omit<SupplierEvalRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: SupplierStatus, notes?: string) => void;
  transitionStatus: (id: string, to: SupplierStatus, by: string, reason: string, kind: SupplierStateHistoryEntry['kind']) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  approveSupplier: (id: string, approverName: string, comments?: string) => void;
  markConditional: (id: string, actorName: string, comments?: string) => void;
  rejectSupplier: (id: string, rejectorName: string, comments?: string) => void;
  reopenSupplier: (id: string, actorName: string, reason: string) => void;
  setRecords: (records: SupplierEvalRecord[]) => void;
}

const SEED_DATA: SupplierEvalRecord[] = [
  {
    id: 'sup-1',
    name: 'Jubail Industrial Services',
    category: 'Subcontractor - Mechanical',
    status: 'Approved',
    score: 92,
    lastEvalDate: '2026-01-15',
    nextEvalDate: '2027-01-15',
    contactPerson: 'Ali Hassan',
    email: 'ali@jubailind.com',
    findings: 'Consistent high quality.',
    approvedBy: 'Procurement Committee',
    approvalDate: '2026-01-15',
    approvalComments: 'Annual evaluation completed successfully.',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useSupplierEvalStore = create<SupplierEvalStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const now = new Date().toISOString();
        const id = generateRecordId('sup');
        const record: SupplierEvalRecord = {
          ...data,
          id,
          status: data.status || 'Under Evaluation',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ records: [record, ...s.records] }));
        useAuditStore.getState().log('create', 'supplier', id, undefined, JSON.stringify(record));
        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const updated: SupplierEvalRecord = {
          ...existing,
          ...data,
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? updated : r)),
        }));
        useAuditStore.getState().log(
          'update',
          'supplier',
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
        useAuditStore.getState().log('status_change', 'supplier', id, existing.status, status, notes);
      },

      /** Generic state-machine mover: records a typed, reasoned entry in stateHistory for every transition. */
      transitionStatus: (id, to, by, reason, kind) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const historyEntry: SupplierStateHistoryEntry = { from: existing.status, to, by, at: now, reason, kind };
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? { ...r, status: to, stateHistory: [...(r.stateHistory ?? []), historyEntry], updatedAt: now }
              : r
          ),
        }));
        useAuditStore.getState().log('status_change', 'supplier', id, existing.status, to, reason);
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'supplier', id, JSON.stringify(existing), undefined);
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
          'supplier',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'Archived supplier'
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
          'supplier',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Unarchived supplier'
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

      approveSupplier: (id, approverName, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const historyEntry: SupplierStateHistoryEntry = {
          from: existing.status,
          to: 'Approved',
          by: approverName,
          at: now,
          reason: comments || 'Approved by authorized evaluator',
          kind: 'verify',
        };
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Approved',
          approvedBy: approverName,
          approvalDate: dateStr,
          approvalComments: comments || existing.approvalComments || 'Approved by authorized evaluator',
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updateData } : r)),
        }));
        useAuditStore.getState().log(
          'approve',
          'supplier',
          id,
          JSON.stringify(existing),
          JSON.stringify(updateData),
          comments || 'Supplier evaluation approved'
        );
      },

      markConditional: (id, actorName, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const historyEntry: SupplierStateHistoryEntry = {
          from: existing.status,
          to: 'Conditional',
          by: actorName,
          at: now,
          reason: comments || 'Approved with conditions pending corrective action',
          kind: 'forward',
        };
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Conditional',
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updateData } : r)),
        }));
        useAuditStore.getState().log(
          'status_change',
          'supplier',
          id,
          existing.status,
          'Conditional',
          comments || 'Supplier conditionally approved pending corrective action'
        );
      },

      rejectSupplier: (id, rejectorName, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const historyEntry: SupplierStateHistoryEntry = {
          from: existing.status,
          to: 'Rejected',
          by: rejectorName,
          at: now,
          reason: comments || 'Supplier failed evaluation criteria',
          kind: 'reject',
        };
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Rejected',
          rejectedBy: rejectorName,
          rejectionDate: dateStr,
          rejectionReason: comments || 'Supplier failed evaluation criteria',
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updateData } : r)),
        }));
        useAuditStore.getState().log(
          'reject',
          'supplier',
          id,
          JSON.stringify(existing),
          JSON.stringify(updateData),
          comments || 'Supplier evaluation rejected'
        );
      },

      reopenSupplier: (id, actorName, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const historyEntry: SupplierStateHistoryEntry = {
          from: existing.status,
          to: 'Under Evaluation',
          by: actorName,
          at: now,
          reason,
          kind: 'reopen',
        };
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Under Evaluation',
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
          updatedAt: now,
        };
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updateData } : r)),
        }));
        useAuditStore.getState().log(
          'status_change',
          'supplier',
          id,
          existing.status,
          'Under Evaluation',
          reason
        );
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'supplier',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useSupplierEvalStore' }
  )
);
