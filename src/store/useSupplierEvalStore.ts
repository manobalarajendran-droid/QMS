import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { SupplierStatus, SupplierEvalRecord } from '../types';

export type { SupplierStatus, SupplierEvalRecord } from '../types';

export interface SupplierEvalStoreState {
  records: SupplierEvalRecord[];
  addRecord: (data: Omit<SupplierEvalRecord, 'id' | 'createdAt' | 'updatedAt'>) => SupplierEvalRecord;
  updateRecord: (id: string, data: Partial<Omit<SupplierEvalRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: SupplierStatus, notes?: string) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  approveSupplier: (id: string, approverName: string, comments?: string) => void;
  rejectSupplier: (id: string, rejectorName: string, comments?: string) => void;
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
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Approved',
          approvedBy: approverName,
          approvalDate: dateStr,
          approvalComments: comments || existing.approvalComments || 'Approved by authorized evaluator',
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

      rejectSupplier: (id, rejectorName, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const dateStr = now.split('T')[0];
        const updateData: Partial<SupplierEvalRecord> = {
          status: 'Rejected',
          approvedBy: rejectorName,
          approvalDate: dateStr,
          approvalComments: comments || 'Supplier failed evaluation criteria',
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
