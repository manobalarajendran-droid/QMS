import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId, generateDocNo } from '../lib/idGenerator';
import type { MRMRecord, MRMStatus, MRMActionItem, MRMStateHistoryEntry } from '../types';

export type { MRMRecord, MRMStatus, MRMActionItem, MRMStateHistoryEntry } from '../types';

// ── Store ────────────────────────────────────────────────────────────────────

export interface MRMStoreState {
  records: MRMRecord[];
  addRecord: (data: Omit<MRMRecord, 'id' | 'createdAt' | 'updatedAt'>) => MRMRecord;
  updateRecord: (id: string, data: Partial<Omit<MRMRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: MRMStatus, reason?: string) => void;
  transitionStatus: (
    id: string,
    to: MRMStatus,
    by: string,
    reason: string,
    kind: MRMStateHistoryEntry['kind']
  ) => void;
  reviewMinutes: (id: string, reviewer: string, comments?: string) => void;
  approveMinutes: (id: string, approver: string, comments?: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  deleteRecord: (id: string) => void;
  addActionItem: (mrmId: string, item: Omit<MRMActionItem, 'id'>) => MRMActionItem;
  updateActionItem: (mrmId: string, itemId: string, data: Partial<MRMActionItem>) => void;
  deleteActionItem: (mrmId: string, itemId: string) => void;
  setRecords: (records: MRMRecord[]) => void;
}

/**
 * Generates a collision-proof MRM meeting number by scanning existing records
 * for the highest integer sequence in the current year.
 */
export function generateMeetingNo(records: MRMRecord[]): string {
  return generateDocNo('MRM', new Date().getFullYear(), records, 'meetingNo', 2);
}

const SEED_DATA: MRMRecord[] = [
  {
    id: 'mrm-seed-001',
    meetingDate: '2025-06-15',
    meetingNo: 'MRM-2025-01',
    chairperson: 'GM / COO',
    attendees: ['MANOBALA Rajendran (MR)', 'Operations HOD', 'HSE Manager', 'QA/QC Manager', 'Planning Manager'],
    venue: 'PTA Board Room — Jubail',
    status: 'Completed',
    agendaItems: [
      '1. Review of QMS Performance & KPIs',
      '2. NCR & CAPA Status Review',
      '3. Customer Satisfaction Index (CSI) Review',
      '4. TÜV Surveillance Audit Status',
      '5. Quality Objectives Progress — 2025',
      '6. Risk & Opportunities Update',
    ],
    inputs: {
      customerFeedback: true,
      objectivesReview: true,
      processPerformance: true,
      ncrsAndCAPAs: true,
      auditFindings: true,
      supplierPerformance: true,
      resourceAdequacy: true,
      riskOpportunities: true,
    },
    minutesSummary: 'All inputs reviewed. QMS performing adequately. NCR closure rate at 90%. CSI score above target. TÜV Surveillance No.2 completed with 3 recommendations.',
    decisions: 'Increase pre-TA awareness sessions to twice per quarter. QA/QC to deploy ITP Hold Point briefing for all site supervisors before every TA.',
    actionItems: [
      {
        id: 'mrm-action-001',
        description: 'Deploy ITP Hold Point awareness briefings to all site supervisors',
        owner: 'MANOBALA Rajendran (MR)',
        dueDate: '2025-09-01',
        status: 'Closed',
        closedAt: '2025-08-20',
      },
      {
        id: 'mrm-action-002',
        description: 'Submit updated Risk Register to GM for approval',
        owner: 'QA/QC Manager',
        dueDate: '2025-07-31',
        status: 'Closed',
        closedAt: '2025-07-28',
      },
    ],
    flaggedObjectiveMisses: [],
    flaggedSLABreaches: [],
    isArchived: false,
    createdAt: '2025-06-15T09:00:00.000Z',
    updatedAt: '2025-06-15T13:00:00.000Z',
  },
];

export const useMRMStore = create<MRMStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('mrm');
        const now = new Date().toISOString();
        const record: MRMRecord = {
          ...data,
          id,
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ records: [record, ...state.records] }));
        useAuditStore.getState().log('create', 'mrm', id, undefined, JSON.stringify(record));
        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: now } : r
          ),
        }));
        useAuditStore.getState().log('update', 'mrm', id, JSON.stringify(existing), JSON.stringify(data));
      },

      updateStatus: (id, status, reason) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, status, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log('status_change', 'mrm', id, existing.status, status, reason);
      },

      transitionStatus: (id, to, by, reason, kind) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];
        const historyEntry: MRMStateHistoryEntry = { from: existing.status, to, by, at: now, reason, kind };

        const reviewFields: Partial<MRMRecord> =
          to === 'Reviewed'
            ? { reviewedBy: by, reviewDate: existing.reviewDate || todayStr, reviewComments: reason }
            : {};
        const approvalFields: Partial<MRMRecord> =
          to === 'Approved'
            ? { approvedBy: by, approvalDate: existing.approvalDate || todayStr, approvalComments: reason }
            : {};

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: to,
                  ...reviewFields,
                  ...approvalFields,
                  stateHistory: [...(r.stateHistory ?? []), historyEntry],
                  updatedAt: now,
                }
              : r
          ),
        }));

        useAuditStore.getState().log('status_change', 'mrm', id, existing.status, to, reason);
      },

      reviewMinutes: (id, reviewer, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        const updatedFields: Partial<MRMRecord> = {
          status: 'Reviewed',
          reviewedBy: reviewer,
          reviewDate: todayStr,
          reviewComments: comments ?? '',
          updatedAt: now,
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'review',
          'mrm',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          comments || 'Meeting minutes reviewed by MR'
        );
      },

      approveMinutes: (id, approver, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        const updatedFields: Partial<MRMRecord> = {
          status: 'Approved',
          approvedBy: approver,
          approvalDate: todayStr,
          approvalComments: comments ?? '',
          updatedAt: now,
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'approve',
          'mrm',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          comments || 'Meeting minutes approved by Chairperson / GM'
        );
      },

      archiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isArchived: true, updatedAt: now } : r
          ),
        }));
        useAuditStore.getState().log(
          'archive',
          'mrm',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'Meeting record archived'
        );
      },

      unarchiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isArchived: false, updatedAt: now } : r
          ),
        }));
        useAuditStore.getState().log(
          'unarchive',
          'mrm',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Meeting record unarchived'
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
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'mrm', id, JSON.stringify(existing), undefined);
      },

      addActionItem: (mrmId, item) => {
        const newItem: MRMActionItem = { ...item, id: generateRecordId('mrm-action') };
        const now = new Date().toISOString();

        set((state) => ({
          records: state.records.map((r) =>
            r.id === mrmId
              ? { ...r, actionItems: [...r.actionItems, newItem], updatedAt: now }
              : r
          ),
        }));

        useAuditStore.getState().log(
          'create',
          'mrm_action',
          mrmId,
          undefined,
          JSON.stringify(newItem),
          `Added action item: ${newItem.description}`
        );

        return newItem;
      },

      updateActionItem: (mrmId, itemId, data) => {
        const existingMRM = get().records.find((r) => r.id === mrmId);
        const existingItem = existingMRM?.actionItems.find((a) => a.id === itemId);
        const now = new Date().toISOString();

        set((state) => ({
          records: state.records.map((r) =>
            r.id === mrmId
              ? {
                  ...r,
                  actionItems: r.actionItems.map((a) => (a.id === itemId ? { ...a, ...data } : a)),
                  updatedAt: now,
                }
              : r
          ),
        }));

        useAuditStore.getState().log(
          'update',
          'mrm_action',
          mrmId,
          JSON.stringify(existingItem),
          JSON.stringify(data),
          `Updated action item: ${itemId}`
        );
      },

      deleteActionItem: (mrmId, itemId) => {
        const existingMRM = get().records.find((r) => r.id === mrmId);
        const existingItem = existingMRM?.actionItems.find((a) => a.id === itemId);
        const now = new Date().toISOString();

        set((state) => ({
          records: state.records.map((r) =>
            r.id === mrmId
              ? {
                  ...r,
                  actionItems: r.actionItems.filter((a) => a.id !== itemId),
                  updatedAt: now,
                }
              : r
          ),
        }));

        useAuditStore.getState().log(
          'delete',
          'mrm_action',
          mrmId,
          JSON.stringify(existingItem),
          undefined,
          `Deleted action item: ${itemId}`
        );
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'mrm',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useMRMStore' }
  )
);


