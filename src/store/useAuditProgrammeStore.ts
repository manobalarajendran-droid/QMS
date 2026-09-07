import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { AuditProgrammeRecord, AuditProgrammeRecordStatus } from '../types';

export type { AuditProgrammeRecord, AuditProgrammeRecordStatus } from '../types';

// ── Store ────────────────────────────────────────────────────────────────────

export interface AuditProgrammeStoreState {
  records: AuditProgrammeRecord[];
  addRecord: (data: Omit<AuditProgrammeRecord, 'id' | 'createdAt' | 'updatedAt'>) => AuditProgrammeRecord;
  updateRecord: (id: string, data: Partial<Omit<AuditProgrammeRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: AuditProgrammeRecordStatus, notes?: string) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: AuditProgrammeRecord[]) => void;
}

const SEED_DATA: AuditProgrammeRecord[] = [
  {
    "id": "auditprogrammestores-1788689476883-0",
    "ref": "IA-2025-01",
    "sc": "Cl.4–10 Full QMS System Audit",
    "aud": "MANOBALA (MR)",
    "dep": "All Departments",
    "dt": "2025-11-15",
    "nc": 1,
    "obs": 1,
    "fnd": "NCR: PT-QSP-QC-04 scope boundary and submission route (7 sub-findings). Observation: Cl.7.1.3 spare parts documentation gap (carried from TÜV R4). QMS files reorganized. 64 files pending manual review flagged.",
    "rpt": "IA-2025-01-RPT",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Report Issued"
  },
  {
    "id": "auditprogrammestores-1788689476883-1",
    "ref": "IA-2026-01",
    "sc": "Proposals & Bidding Office (CPD) — Cl.8.2",
    "aud": "Royson Pradeep Vas",
    "dep": "Contracts & Planning",
    "auditee": "Shameem / Shravan",
    "phase": "Phase 1",
    "dt": "2026-05-18",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 18 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-2",
    "ref": "IA-2026-02",
    "sc": "Process Control — Cl.8.5",
    "aud": "Amalraj",
    "dep": "Projects / Operations",
    "auditee": "Satheeshan / Nada",
    "phase": "Phase 1",
    "dt": "2026-05-18",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 18 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-3",
    "ref": "IA-2026-03",
    "sc": "Purchasing, Selection of External Providers — Cl.8.4",
    "aud": "Mohammed Shafiullah",
    "dep": "Purchase Office",
    "auditee": "Amal / Chetan",
    "phase": "Phase 1",
    "dt": "2026-05-19",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 19 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-4",
    "ref": "IA-2026-04",
    "sc": "Document Control / Internal Audit / CAR / Customer Satisfaction — Cl.7.5,9.2,10.2,9.1.2",
    "aud": "Vincent Joseph",
    "dep": "Management Representative",
    "auditee": "Manobala Rajendran",
    "phase": "Phase 1",
    "dt": "2026-05-19",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 19 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-5",
    "ref": "IA-2026-05",
    "sc": "HR Management — Cl.7.1.2,7.2,7.3",
    "aud": "Mohammed Ali",
    "dep": "Administration & HRD",
    "auditee": "Mubashir / Ratheesh",
    "phase": "Phase 1",
    "dt": "2026-05-20",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 20 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-6",
    "ref": "IA-2026-06",
    "sc": "Storing, Receiving & Issuance of Material, Selection of External Provider — Cl.8.5.4,8.4",
    "aud": "Vipin Das",
    "dep": "Stores & Subcontracting",
    "auditee": "Royson Pradeep Vas",
    "phase": "Phase 1",
    "dt": "2026-05-20",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 20 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-7",
    "ref": "IA-2026-07",
    "sc": "Receiving & Final Inspection, Control of Monitoring & Measuring Equipment — Cl.8.6,7.1.5",
    "aud": "Royson Pradeep Vas",
    "dep": "Q.C. Office",
    "auditee": "Manobala Rajendran",
    "phase": "Phase 1",
    "dt": "2026-05-21",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 21 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-8",
    "ref": "IA-2026-08",
    "sc": "Plant & Equipment Maintenance — Cl.7.1.3",
    "aud": "Mohammed Shafiullah",
    "dep": "Maintenance, Equipment & Transport Office",
    "auditee": "Vipin Das / Raja",
    "phase": "Phase 1",
    "dt": "2026-05-21",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 21 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-9",
    "ref": "IA-2026-09",
    "sc": "Facility Management: PTA Camp / Office / Yard — Cl.7.1.3",
    "aud": "Vincent Joseph",
    "dep": "Facility",
    "auditee": "Asif",
    "phase": "Phase 1",
    "dt": "2026-05-22",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 22 May 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-10",
    "ref": "IA-2026-11",
    "sc": "Marketing Activities, Customer Communication, Enquiry Handling — Cl.8.2,9.1.2",
    "aud": "Royson Pradeep Vas",
    "dep": "Marketing",
    "auditee": "Ms. Nauf / Khozama",
    "phase": "Phase 2",
    "dt": "2026-06-22",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 22 June 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-11",
    "ref": "IA-2026-12",
    "sc": "Equipment & Resource Deployment, Subcontractor Management — Cl.7.1.3,8.4",
    "aud": "Mohammed Ali",
    "dep": "ESD / Resources",
    "auditee": "Anil Rodrigues",
    "phase": "Phase 2",
    "dt": "2026-06-23",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 23 June 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  },
  {
    "id": "auditprogrammestores-1788689476883-12",
    "ref": "IA-2026-13",
    "sc": "Fabrication Processes, Quality Control, Dimensional Verification — Cl.8.5.1,8.6",
    "aud": "Vipin Das",
    "dep": "Fabrication",
    "auditee": "Jithin",
    "phase": "Phase 2",
    "dt": "2026-06-24",
    "nc": 0,
    "obs": 0,
    "fnd": "Planned — 24 June 2026",
    "rpt": "",
    "createdAt": "2026-09-06T10:11:16.883Z",
    "updatedAt": "2026-09-06T10:11:16.883Z",
    "status": "Planned"
  }
];

export const useAuditProgrammeStore = create<AuditProgrammeStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('audit');
        const now = new Date().toISOString();
        const record: AuditProgrammeRecord = {
          ...data,
          id,
          status: data.status || 'Planned',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ records: [...state.records, record] }));

        useAuditStore.getState().log(
          'create',
          'audit_programme',
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
        const updated: AuditProgrammeRecord = {
          ...existing,
          ...data,
          updatedAt: now,
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? updated : r)),
        }));

        useAuditStore.getState().log(
          'update',
          'audit_programme',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, notes) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const completedDate =
          status === 'Completed' || status === 'Report Issued'
            ? existing.completedDate || now.split('T')[0]
            : existing.completedDate;

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, completedDate, updatedAt: now } : r
          ),
        }));

        useAuditStore.getState().log(
          'status_change',
          'audit_programme',
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
          'audit_programme',
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
          'audit_programme',
          id,
          JSON.stringify({ isArchived: existing.isArchived }),
          JSON.stringify({ isArchived: true }),
          'Archived audit record'
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
          'audit_programme',
          id,
          JSON.stringify({ isArchived: existing.isArchived }),
          JSON.stringify({ isArchived: false }),
          'Unarchived audit record'
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
          'audit_programme',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useAuditProgrammeStore' }
  )
);
