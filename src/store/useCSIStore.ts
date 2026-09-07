import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type {
  CSIRecord,
  CSIRecordStatus,
} from '../types';
import { calculateCSIScore } from '../types';

export type {
  CSIRecord,
  CSIRecordStatus,
  CSIRating,
  CSIIcon,
  CSICriteriaQuestion,
  CSICriteriaCategory,
} from '../types';
export { calculateCSIScore, CSI_QUESTIONS } from '../types';
export { CSI_QUESTIONS as CS_QUESTIONS } from '../types';

// ── Store ────────────────────────────────────────────────────────────────────

export interface CSIStoreState {
  records: CSIRecord[];
  addRecord: (data: Omit<CSIRecord, 'id' | 'createdAt' | 'updatedAt'>) => CSIRecord;
  updateRecord: (id: string, data: Partial<Omit<CSIRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: CSIRecordStatus) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: CSIRecord[]) => void;
}

const SEED_DATA: CSIRecord[] = [
  {
    "id": "csistores-1788689476863-0",
    "cl": "AR-RAZI",
    "proj": "TAM IV-2025 — Catalyst Bed R-4101 HDS",
    "score": "0.88",
    "rating": "Good",
    "icon": "✔",
    "obs": "More focus on Quality Work and Time",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-1",
    "cl": "AR-RAZI",
    "proj": "TAM IV-2025 — SPC Reactor Catalyst Change-Out",
    "score": "0.90",
    "rating": "Excellent",
    "icon": "★",
    "obs": "More focus on Quality Work and Time",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-2",
    "cl": "MAADEN",
    "proj": "PAP TAM 2025",
    "score": "0.781",
    "rating": "Fair",
    "icon": "▲",
    "obs": "Focus on Skilled Workers",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-3",
    "cl": "PKN/EDC",
    "proj": "EDC T/A-2025",
    "score": "0.90",
    "rating": "Excellent",
    "icon": "★",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-4",
    "cl": "TASNEE",
    "proj": "AA Unit SD-2025",
    "score": "0.939",
    "rating": "Excellent",
    "icon": "★",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-5",
    "cl": "TASNEE",
    "proj": "HCL Column TC-1401 Cleaning",
    "score": "0.917",
    "rating": "Excellent",
    "icon": "★",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-6",
    "cl": "SIPCHEM/SAHARA",
    "proj": "Reactor Screen Repair R-l104 & R-l103",
    "score": "0.795",
    "rating": "Fair",
    "icon": "▲",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-7",
    "cl": "SIPCHEM/SAHARA",
    "proj": "Catalyst Replacement D1107",
    "score": "0.7347",
    "rating": "Needs Improvement",
    "icon": "✘",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-8",
    "cl": "SIPCHEM/SAHARA",
    "proj": "Emergency Service ESD-2025",
    "score": "0.782",
    "rating": "Fair",
    "icon": "▲",
    "obs": "Resource Issue",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-9",
    "cl": "S-CHEM",
    "proj": "Mechanical Dry Cleaning",
    "score": "0.6652",
    "rating": "Needs Improvement",
    "icon": "✘",
    "obs": "Mech Cleaning not effective; tube cleaning unsuccessful",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-10",
    "cl": "S-CHEM",
    "proj": "SCP & UTILITY T/A-2025",
    "score": "0.8521",
    "rating": "Good",
    "icon": "✔",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-11",
    "cl": "PKN/IBN ZAHR",
    "proj": "MTBE T/A-2025",
    "score": "0.8869",
    "rating": "Good",
    "icon": "✔",
    "obs": "Monitor and arrange better facilities; deploy designated personnel at bus stations",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-12",
    "cl": "MAADEN",
    "proj": "Maaden PAU-2025 TAM",
    "score": "0.8434",
    "rating": "Satisfactory",
    "icon": "◑",
    "obs": "—",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-13",
    "cl": "GAS",
    "proj": "Oil Separator Repair Work",
    "score": "0.7695",
    "rating": "Fair",
    "icon": "▲",
    "obs": "Fail to provide QA/QC documents",
    "yr": "2025",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  },
  {
    "id": "csistores-1788689476863-14",
    "dt": "09-Mar-2026",
    "projCode": "P3696-12-38",
    "proj": "Tasnee HDPE TA",
    "po": "5500119579",
    "cl": "TASNEE",
    "yr": "2026",
    "scores": {
      "9": 9,
      "1A": 8,
      "1B": 9,
      "2A": 8,
      "2B": 8,
      "3A": 9,
      "3B": 8,
      "4A": 8,
      "4B": 9,
      "5A": 7,
      "5B": 8,
      "6A": 7,
      "6B": 8,
      "6C": 8,
      "7A": 7,
      "7B": 9,
      "7C": 9,
      "8A": 9,
      "8C": 8,
      "8D": 9,
      "8E": 9
    },
    "score": "0.8286",
    "rating": "Satisfactory",
    "icon": "◑",
    "suggestions": "",
    "clientName": "Faisal F. Al-Marri",
    "clientDesig": "Superintendent PP Maintenance, ID#10677",
    "obs": "",
    "createdAt": "2026-09-06T10:11:16.863Z",
    "updatedAt": "2026-09-06T10:11:16.863Z"
  }
];

export const useCSIStore = create<CSIStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('csi');
        const now = new Date().toISOString();

        // Auto-calculate score & rating if scores map is supplied
        let score = data.score;
        let totalScore = data.totalScore;
        let rating = data.rating;
        let icon = data.icon;

        if (data.scores && Object.keys(data.scores).length > 0) {
          const calc = calculateCSIScore(data.scores);
          totalScore = totalScore ?? calc.totalScore;
          score = score ?? calc.scoreNormalized;
          rating = rating ?? calc.rating;
          icon = icon ?? calc.icon;
        }

        const record: CSIRecord = {
          ...data,
          id,
          score,
          totalScore,
          rating,
          icon,
          status: data.status || 'open',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ records: [record, ...state.records] }));

        useAuditStore.getState().log(
          'create',
          'csi',
          id,
          undefined,
          JSON.stringify(record)
        );

        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();

        let computedFields: Partial<CSIRecord> = {};
        if (data.scores && Object.keys(data.scores).length > 0) {
          const calc = calculateCSIScore(data.scores);
          computedFields = {
            totalScore: data.totalScore ?? calc.totalScore,
            score: data.score ?? calc.scoreNormalized,
            rating: data.rating ?? calc.rating,
            icon: data.icon ?? calc.icon,
          };
        }

        const updated: CSIRecord = {
          ...existing,
          ...data,
          ...computedFields,
          updatedAt: now,
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? updated : r)),
        }));

        useAuditStore.getState().log(
          'update',
          'csi',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, updatedAt: now } : r
          ),
        }));

        useAuditStore.getState().log(
          'status_change',
          'csi',
          id,
          existing.status,
          status
        );
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log(
          'delete',
          'csi',
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
          'csi',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'Archived survey'
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
          'csi',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Unarchived survey'
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
          'csi',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useCSIStore' }
  )
);
