import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { TUVRecord, TUVRecordStatus } from '../types';

export type { TUVRecord, TUVRecordStatus } from '../types';

// ── Overdue & Date Helpers ───────────────────────────────────────────────────

export function getTUVDaysRemaining(dueDate?: string): number | null {
  if (!dueDate) return null;
  const target = new Date(dueDate);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
}

export function isTUVOverdue(record: TUVRecord): boolean {
  if (record.status === 'Closed' || !record.due) return false;
  const days = getTUVDaysRemaining(record.due);
  return days !== null && days < 0;
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface TUVStoreState {
  records: TUVRecord[];
  addRecord: (data: Omit<TUVRecord, 'id' | 'createdAt' | 'updatedAt'>) => TUVRecord;
  updateRecord: (id: string, data: Partial<Omit<TUVRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: TUVRecordStatus, notes?: string) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: TUVRecord[]) => void;
}

const SEED_DATA: TUVRecord[] = [
  {
    "id": "tuvstores-1788689476861-0",
    "num": "R1",
    "cl": "4.3",
    "desc": "Review Clause 8.3 exclusion justification — PTA involved in pre-commissioning activities which may trigger design validation requirements. Validate if 8.3 exclusion is still appropriate.",
    "owner": "MR (MANOBALA)",
    "due": "2026-04-30",
    "evidence": "PT/QM/01 Rev 04 Clause 4.3.3(b) revised — exclusion justified and documented. Pre-commissioning activities mapped; no design responsibility confirmed.",
    "closed": "2026-04-01",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "Closed"
  },
  {
    "id": "tuvstores-1788689476861-1",
    "num": "R2",
    "cl": "9.2",
    "desc": "Review internal audit observation categorization methodology — findings were not clearly categorized as NCs vs observations per TÜV methodology. Revise FM-ACL-02 audit checklist accordingly.",
    "owner": "MR (MANOBALA)",
    "due": "2026-04-30",
    "evidence": "FM-ACL-02 revised to include explicit categorization column: NC / Observation / Opportunity for Improvement. Methodology documented in IA procedure.",
    "closed": "2026-04-01",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "Closed"
  },
  {
    "id": "tuvstores-1788689476861-2",
    "num": "R3",
    "cl": "7.5",
    "desc": "All forms used operationally must be registered in the QMS Document Master List — Equipment Loading Chart, Manpower Loading Chart, and Catalyst Quantity Monitoring Form are in use but not registered.",
    "owner": "MR + P&E Dept + Projects",
    "due": "2026-04-30",
    "evidence": "Projects dept has converted Equipment Loading Chart and Manpower Loading Chart to controlled documents (fixed header + approval block, adaptive content body per MANOBALA's accepted approach). Registration in DML pending. Catalyst form — not yet actioned.",
    "closed": "",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "In Progress"
  },
  {
    "id": "tuvstores-1788689476861-3",
    "num": "R4",
    "cl": "7.1.3",
    "desc": "Spare parts and consumables must be formally linked to material request process — no documented traceability. Technician skill matrix to be created and maintained for all technical staff.",
    "owner": "OSD Manager",
    "due": "2026-05-31",
    "evidence": "ERP module development in progress — Vipin + Ibrahim. Skill matrix template drafted. Mubashir to provide data. OPEN — evidence not yet complete.",
    "closed": "",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "In Progress"
  },
  {
    "id": "tuvstores-1788689476861-4",
    "num": "R5",
    "cl": "8.5",
    "desc": "Consolidated lessons learned report not maintained for all projects. MOS (Method of Statements) submittals to clients not tracked by registration number and revision — no log exists.",
    "owner": "Projects Dept / P&E",
    "due": "2026-05-31",
    "evidence": "MOS submittal log format discussed. Projects Dept to create log with reg.no., revision tracking, submission dates. Lessons learned format to be defined. NOT STARTED.",
    "closed": "",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "Open"
  },
  {
    "id": "tuvstores-1788689476861-5",
    "num": "R6",
    "cl": "8.6",
    "desc": "Quality Plan Section 4.16 — client design drawings are required and prior approval must be obtained from client before fabrication drawings are issued. Procedure text did not explicitly state this.",
    "owner": "IED (MANOBALA)",
    "due": "2026-04-30",
    "evidence": "PT-QSP-QC-04 Rev 02 Lean — Section 6.4 addresses client drawing approval gate before fabrication. Rev 02 pending GM signature. Evidence will be formal once Rev 02 issued.",
    "closed": "",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "In Progress"
  },
  {
    "id": "tuvstores-1788689476861-6",
    "num": "R7",
    "cl": "8.7",
    "desc": "Catalyst loading/unloading inspection — inspection per MOS must be detailed in QC records. ITP must include a specific catalyst loading/unloading inspection checklist.",
    "owner": "IED / Safiullah",
    "due": "2026-04-30",
    "evidence": "Safiullah to develop catalyst loading ITP checklist as part of MAADEN/IBN ZAHR scope. NOT YET DONE.",
    "closed": "",
    "createdAt": "2026-09-06T10:11:16.861Z",
    "updatedAt": "2026-09-06T10:11:16.861Z",
    "status": "Open"
  }
];

export const useTUVStore = create<TUVStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('tuv');
        const now = new Date().toISOString();
        const record: TUVRecord = {
          ...data,
          id,
          status: data.status || 'Open',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ records: [record, ...state.records] }));

        useAuditStore.getState().log(
          'create',
          'tuv',
          id,
          undefined,
          JSON.stringify(record)
        );

        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const updated: TUVRecord = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? updated : r)),
        }));

        useAuditStore.getState().log(
          'update',
          'tuv',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, notes) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const closedDate = status === 'Closed' ? (existing.closed || now.split('T')[0]) : existing.closed;

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, closed: closedDate, updatedAt: now } : r
          ),
        }));

        useAuditStore.getState().log(
          'status_change',
          'tuv',
          id,
          existing.status,
          status,
          notes
        );
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log(
          'delete',
          'tuv',
          id,
          JSON.stringify(existing),
          undefined
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
          'tuv',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'Archived TÜV finding'
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
          'tuv',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Unarchived TÜV finding'
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
          'tuv',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useTUVStore' }
  )
);
