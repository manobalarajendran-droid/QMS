import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';

// ── Types ────────────────────────────────────────────────────────────────────

export type QMSDocumentStatus = 'Pending' | 'Ready' | 'Verify' | 'Missing';

export interface QMSDocument {
  id: string;
  num?: any;
  item?: any;
  ref?: any;
  status: QMSDocumentStatus;
  note?: any;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface QMSStoreState {
  records: QMSDocument[];
  addRecord: (data: Omit<QMSDocument, 'id' | 'createdAt' | 'updatedAt'>) => QMSDocument;
  updateRecord: (id: string, data: Partial<Omit<QMSDocument, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: QMSDocumentStatus) => void;
  deleteRecord: (id: string) => void;
}

const SEED_DATA: QMSDocument[] = [
  {
    "id": "qmsstores-1788689476833-0",
    "num": "1",
    "item": "Quality Policy — current revision, GM signed",
    "ref": "QP-001",
    "note": "Rev 02 drafted Mar 2026. Bilingual layout, 11 departments. PENDING GM SIGNATURE.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Pending"
  },
  {
    "id": "qmsstores-1788689476833-1",
    "num": "2",
    "item": "Document Master List — all procedures listed (FM/DML/01)",
    "ref": "FM/DML/01 Rev 05",
    "note": "208 documents. FM-DML-01 Rev 05 issued. Updated in this dashboard.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Ready"
  },
  {
    "id": "qmsstores-1788689476833-2",
    "num": "3",
    "item": "Document Issue Register — current copy holders listed",
    "ref": "FM-DDL-25",
    "note": "Verify FM-DDL-25 is current and all copy holders are listed.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Verify"
  },
  {
    "id": "qmsstores-1788689476833-3",
    "num": "4",
    "item": "NCR Log — updated monthly (FM-NCL-03)",
    "ref": "FM-NC-03",
    "note": "Monthly update required per PT/QSP/MR/03 Cl.6.3.1. Confirm last update date.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Verify"
  },
  {
    "id": "qmsstores-1788689476833-4",
    "num": "5",
    "item": "Filled NCR examples — minimum 3–5 closed (FM-NC-13)",
    "ref": "FM-NC-13 Rev 03",
    "note": "6 closed NCRs on record (2023–2024). Forms must be physically filed.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Ready"
  },
  {
    "id": "qmsstores-1788689476833-5",
    "num": "6",
    "item": "CAR Log (FM-CAL-14)",
    "ref": "FM-CAL-14",
    "note": "Verify FM-CAL-14 is current. Note: MR-03 Rev 03 may consolidate CAR into FM-NC-13 — cross-check.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Verify"
  },
  {
    "id": "qmsstores-1788689476833-6",
    "num": "7",
    "item": "MRM Minutes — last meeting (MRM-2025-02, Jul 2025)",
    "ref": "MRM-2025-02",
    "note": "Signed minutes on file. MRM-2025-02-Minutes.pdf.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Ready"
  },
  {
    "id": "qmsstores-1788689476833-7",
    "num": "8",
    "item": "MRM Action Tracker — current status",
    "ref": "MRM Actions",
    "note": "5 open actions from MRM-2025-02. Update status before end-April MRM-2026-01.",
    "createdAt": "2026-09-06T10:11:16.833Z",
    "updatedAt": "2026-09-06T10:11:16.833Z",
    "status": "Pending"
  },
  {
    "id": "qmsstores-1788689476834-8",
    "num": "9",
    "item": "Annual Internal Audit Programme 2026 (FM-IAP-06)",
    "ref": "FM-IAP-06",
    "note": "2026 PROGRAMME NOT CREATED. URGENT — must be created before May 2026 audit window.",
    "createdAt": "2026-09-06T10:11:16.834Z",
    "updatedAt": "2026-09-06T10:11:16.834Z",
    "status": "Missing"
  },
  {
    "id": "qmsstores-1788689476834-9",
    "num": "10",
    "item": "Internal Audit Report — last cycle (IA-2025-01)",
    "ref": "FM-IAR-09",
    "note": "IA-2025-01 completed Nov 2025. Report issued. Scan and file digitally if hard copy only.",
    "createdAt": "2026-09-06T10:11:16.834Z",
    "updatedAt": "2026-09-06T10:11:16.834Z",
    "status": "Ready"
  },
  {
    "id": "qmsstores-1788689476834-10",
    "num": "11",
    "item": "Internal Auditor qualification certificates (TÜV/FAHSS)",
    "ref": "TÜV Cert / FAHSS",
    "note": "MANOBALA's auditor certification must be current and on file. Verify expiry date.",
    "createdAt": "2026-09-06T10:11:16.834Z",
    "updatedAt": "2026-09-06T10:11:16.834Z",
    "status": "Verify"
  },
  {
    "id": "qmsstores-1788689476834-11",
    "num": "12",
    "item": "Audit Checklists from last audit (FM-ACL-02)",
    "ref": "FM-ACL-02 Rev 01",
    "note": "FM-ACL-02 revised Oct 2024 per TÜV R2. Filed with IA-2025-01 report.",
    "createdAt": "2026-09-06T10:11:16.834Z",
    "updatedAt": "2026-09-06T10:11:16.834Z",
    "status": "Ready"
  }
];

let idCounter = 12;

export const useQMSStore = create<QMSStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        idCounter += 1;
        const id = 'qmsstores-' + Date.now() + '-' + idCounter;
        const now = new Date().toISOString();
        const record = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
        } as QMSDocument;
        
        set((state) => ({ records: [...state.records, record] }));

        useAuditStore.getState().log(
          'create', 'qmsstores', id,
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
          'update', 'qmsstores', id,
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
          'status_change', 'qmsstores', id,
          existing.status,
          status
        );
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log('delete', 'qmsstores', id, JSON.stringify(existing), undefined);
      },
    }),
    { name: 'qatrial:useQMSStore' }
  )
);
