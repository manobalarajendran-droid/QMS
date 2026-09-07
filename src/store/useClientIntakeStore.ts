import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientIntakeRecordStatus = 'Logged' | 'Acknowledged' | 'Mobilized' | 'Closed';

export interface ClientIntakeRecord {
  id: string;
  intakeType: 'Complaint' | 'Emergency' | 'Inquiry';
  receivedBy: string;
  routedToDept: string;
  timeLogged: string;
  timeAcknowledged?: string;
  timeMobilized?: string;
  description: string;
  title: string;
  status: ClientIntakeRecordStatus;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface ClientIntakeStoreState {
  records: ClientIntakeRecord[];
  addRecord: (data: Omit<ClientIntakeRecord, 'id' | 'createdAt' | 'updatedAt'>) => ClientIntakeRecord;
  updateRecord: (id: string, data: Partial<Omit<ClientIntakeRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: ClientIntakeRecordStatus) => void;
  deleteRecord: (id: string) => void;
}

const SEED_DATA: ClientIntakeRecord[] = [
  {
    id: "voc-2026-001",
    intakeType: "Emergency",
    receivedBy: "Eng. Tariq Al-Ghamdi",
    routedToDept: "Operations",
    timeLogged: "2026-03-01T08:00:00.000Z",
    timeAcknowledged: "2026-03-01T08:18:00.000Z",
    timeMobilized: "2026-03-01T09:10:00.000Z",
    title: "Saudi Aramco — Flange Joint Leakage Emergency Response",
    description: "Emergency containment team requested for pipeline header flange at Berri Gas Plant.",
    status: "Mobilized",
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-01T09:10:00.000Z",
  },
  {
    id: "voc-2026-002",
    intakeType: "Inquiry",
    receivedBy: "Ahmed Al-Shehri",
    routedToDept: "Inspection/QC",
    timeLogged: "2026-03-02T10:30:00.000Z",
    timeAcknowledged: "2026-03-02T10:48:00.000Z",
    timeMobilized: "2026-03-02T11:25:00.000Z",
    title: "SABIC Hadeed — Crane Rigging Certificate Verification",
    description: "Client requesting third-party calibration and inspection certificates for 50T mobile crane prior to turnaround entry.",
    status: "Closed",
    createdAt: "2026-03-02T10:30:00.000Z",
    updatedAt: "2026-03-02T12:00:00.000Z",
  },
  {
    id: "voc-2026-003",
    intakeType: "Complaint",
    receivedBy: "Khalid Mansour",
    routedToDept: "Planning",
    timeLogged: "2026-03-03T14:00:00.000Z",
    timeAcknowledged: "2026-03-03T14:25:00.000Z",
    title: "Ma'aden Phosphate — Hydrotest Documentation Delay",
    description: "Punchlist closure packages for Line P-204 hydrotesting turnaround took 48 hours instead of the agreed 24-hour SLA.",
    status: "Acknowledged",
    createdAt: "2026-03-03T14:00:00.000Z",
    updatedAt: "2026-03-03T14:25:00.000Z",
  },
  {
    id: "voc-2026-004",
    intakeType: "Inquiry",
    receivedBy: "Saleh Al-Otaibi",
    routedToDept: "Maintenance",
    timeLogged: "2026-03-04T09:15:00.000Z",
    timeAcknowledged: "2026-03-04T09:35:00.000Z",
    timeMobilized: "2026-03-04T10:45:00.000Z",
    title: "Petro Rabigh — Heat Exchanger Hydraulic Extractor Request",
    description: "Requesting specialized hydraulic bundle extractor and certified operator crew for upcoming vacuum distillation turnaround.",
    status: "Closed",
    createdAt: "2026-03-04T09:15:00.000Z",
    updatedAt: "2026-03-04T11:00:00.000Z",
  },
  {
    id: "voc-2026-005",
    intakeType: "Complaint",
    receivedBy: "Mohammed Al-Dosari",
    routedToDept: "HSE",
    timeLogged: "2026-03-05T11:00:00.000Z",
    title: "Saudi Aramco Ras Tanura — Hot Work Permit PPE Compliance",
    description: "Subcontractor crew observed with missing specialized leather spats during welding operations on tank TK-301.",
    status: "Logged",
    createdAt: "2026-03-05T11:00:00.000Z",
    updatedAt: "2026-03-05T11:00:00.000Z",
  },
];

let idCounter = 5;

export const useClientIntakeStore = create<ClientIntakeStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        idCounter += 1;
        const id = 'clientintakestores-' + Date.now() + '-' + idCounter;
        const now = new Date().toISOString();
        const record = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
        } as ClientIntakeRecord;
        
        set((state) => ({ records: [...state.records, record] }));

        useAuditStore.getState().log(
          'create', 'clientintakestores', id,
          undefined,
          JSON.stringify(data)
        );

        return record;
      },

      updateRecord: (id, data) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
          ),
        }));

        useAuditStore.getState().log(
          'update', 'clientintakestores', id,
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
          'status_change', 'clientintakestores', id,
          existing.status,
          status
        );
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'clientintakestores', id, JSON.stringify(existing), undefined);
      },
    }),
    { name: 'qatrial:useClientIntakeStore' }
  )
);
