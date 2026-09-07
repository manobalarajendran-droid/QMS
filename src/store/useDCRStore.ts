import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId, generateDocNo } from '../lib/idGenerator';
import type { DCRRecord, DCRStatus } from '../types';

export type { DCRRecord, DCRStatus } from '../types';

export interface DCRStore {
  records: DCRRecord[];
  addRecord: (data: Omit<DCRRecord, 'id' | 'dcrNo' | 'createdAt' | 'updatedAt'>) => DCRRecord;
  updateRecord: (id: string, data: Partial<DCRRecord>) => void;
  updateStatus: (id: string, status: DCRStatus, reason?: string) => void;
  reviewDCR: (id: string, reviewer: string, comments?: string) => void;
  approveDCR: (id: string, approver: string, comments?: string) => void;
  rejectDCR: (id: string, actor: string, comments?: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  deleteRecord: (id: string) => void;
  setRecords: (records: DCRRecord[]) => void;
}

/**
 * Generates a collision-proof DCR number by scanning existing records
 * for the highest integer suffix in the current year.
 */
export function generateDCRNo(records: DCRRecord[]): string {
  return generateDocNo('DCR', new Date().getFullYear(), records, 'dcrNo', 3);
}

export const useDCRStore = create<DCRStore>()(
  persist(
    (set, get) => ({
      records: [
        {
          id: 'dcr-1',
          dcrNo: 'DCR-2026-001',
          docId: '',
          docNo: 'PTA-HSE-P-02',
          title: 'Permit to Work Procedure',
          requestor: 'Rami Al-Saif',
          department: 'HSE',
          changeDescription: 'Add confined space continuous monitoring requirement',
          reason: 'Client SABIC updated their safety standards',
          status: 'Pending Review',
          isArchived: false,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
      ],

      addRecord: (data) => {
        const now = new Date().toISOString();
        const id = generateRecordId('dcr');
        const dcrNo = generateDCRNo(get().records);
        const record: DCRRecord = {
          ...data,
          id,
          dcrNo,
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ records: [record, ...s.records] }));
        useAuditStore.getState().log('create', 'dcr', id, undefined, JSON.stringify(record));
        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: now } : r
          ),
        }));
        useAuditStore.getState().log(
          'update',
          'dcr',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, status, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log('status_change', 'dcr', id, existing.status, status, reason);
      },

      reviewDCR: (id, reviewer, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        const updatedFields: Partial<DCRRecord> = {
          status: 'Reviewed',
          reviewedBy: reviewer,
          reviewDate: todayStr,
          reviewComments: comments ?? '',
          updatedAt: now,
        };

        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'review',
          'dcr',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          comments || 'DCR reviewed by Management Representative'
        );
      },

      approveDCR: (id, approver, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        const updatedFields: Partial<DCRRecord> = {
          status: 'Approved',
          approvedBy: approver,
          approvalDate: todayStr,
          approvalComments: comments ?? '',
          updatedAt: now,
        };

        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'approve',
          'dcr',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          comments || 'DCR approved by General Manager'
        );
      },

      rejectDCR: (id, actor, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        const updatedFields: Partial<DCRRecord> = {
          status: 'Rejected',
          rejectedBy: actor,
          rejectionDate: todayStr,
          rejectionReason: comments ?? '',
          updatedAt: now,
        };

        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'reject',
          'dcr',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          comments || 'DCR rejected'
        );
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
          'dcr',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'DCR archived'
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
          'dcr',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'DCR unarchived'
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

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'dcr', id, JSON.stringify(existing), undefined);
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'dcr',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useDCRStore' }
  )
);
