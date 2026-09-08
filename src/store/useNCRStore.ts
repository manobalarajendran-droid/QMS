import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { NCRRecord, NCRRecordStatus, NCRStateHistoryEntry } from '../types';

export type { NCRRecord, NCRRecordStatus } from '../types';

// ── Store ────────────────────────────────────────────────────────────────────

export interface NCRStoreState {
  records: NCRRecord[];
  addRecord: (data: Omit<NCRRecord, 'id' | 'createdAt' | 'updatedAt'>) => NCRRecord;
  updateRecord: (id: string, data: Partial<Omit<NCRRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: NCRRecordStatus, reason?: string) => void;
  /** Generic state-machine transition: forward, reject/return, or reopen — always records reason + history. */
  transitionStatus: (
    id: string,
    to: NCRRecordStatus,
    by: string,
    reason: string,
    kind: NCRStateHistoryEntry['kind']
  ) => void;
  approveNCR: (id: string, approver: string, comments?: string) => void;
  rejectNCR: (id: string, rejector: string, comments?: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  deleteRecord: (id: string) => void;
  setRecords: (records: NCRRecord[]) => void;
}

const SEED_DATA: NCRRecord[] = [
  {
    "id": "ncrstores-1788689476844-0",
    "ref": "JULY-2024-01",
    "dt": "27-Jul-2024",
    "project": "PLAN-TECH Internal",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "OSD / Calibration",
    "auditeeDept": "OSD",
    "refDoc": "ISO 9001:2015 Cl.7.1.5",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "HP Pump 15-028 pressure gauge: Mismatch between 3rd-party certificate and inspection sticker ID. Certificate and sticker show different instrument IDs.",
    "objEvidence": "Pressure gauge tag: 15-028. Certificate shows different ID. Mismatch identified during QC inspection before deployment.",
    "rcaCat": "Process Gap",
    "rca": "Inspection not carried out when gauge received from supplier. No incoming inspection check against certificate ID at point of receipt.",
    "corrAction": "Contact supplier to revise certificate to match sticker ID, or revise sticker to match certificate. One document to be corrected and reissued.",
    "corrBy": "OSD — Calibration Custodian",
    "prevAction": "Incoming inspection checklist updated to include certificate-to-sticker ID cross-check for all instruments on receipt.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "08-Aug-2024",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-1",
    "ref": "JULY-2024-02",
    "dt": "08-Aug-2024",
    "project": "MAADEN TA",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Projects / Fabrication Team",
    "auditeeDept": "Projects",
    "refDoc": "Site QC Instructions / ITP",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "The name plate was improperly welded, ignoring site QC and Maaden inspector instructions. Work proceeded without QC clearance.",
    "objEvidence": "Site QC report: name plate welded without inspector sign-off. Maaden inspector raised non-compliance notice in writing.",
    "rcaCat": "Process Gap",
    "rca": "1. Process not included in MOS. 2. Absence of QC engineer at time of activity. 3. Communication misunderstanding between fabrication and QC teams.",
    "corrAction": "1. Update MOS with detailed procedure for name plate welding. 2. Ensure QC engineer presence for all welding activities. 3. Train team on communication protocols.",
    "corrBy": "Projects Lead / Fabrication Supervisor",
    "prevAction": "Name plate welding added as Witness Point in ITP. QC engineer sign-off mandatory before any welding on name plates.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "08-Aug-2024",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-2",
    "ref": "DEC-2024-01",
    "dt": "31-Dec-2024",
    "project": "PLAN-TECH Workshop — Steam Jacket",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Fabrication Team",
    "auditeeDept": "Fabrication",
    "refDoc": "ISO 9001:2015 Cl.8.5.1",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Steam Jacket line (100-SCL-4A10-BAB4-NI): Damaged bevel (joint SJ4) and flange serrations due to poor material handling during transport within workshop.",
    "objEvidence": "Physical inspection of joint SJ4: visible bevel damage. Flange serrations damaged on 3 flanges. Damage consistent with improper material handling/transport.",
    "rcaCat": "Training",
    "rca": "Inadequate training on material handling procedures. No specific handling procedure in MOS for delicate weld bevel preparation and machined flange faces.",
    "corrAction": "1. Conduct training on proper material handling for all fabrication personnel. 2. Update handling procedures in MOS. 3. Implement pre-transport inspection checklist.",
    "corrBy": "Fabrication Supervisor",
    "prevAction": "Material handling procedure added to MOS. Pre-transport inspection check introduced as mandatory step before any piping spool movement.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "31-Dec-2024",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-3",
    "ref": "DEC-2024-02",
    "dt": "30-Dec-2024",
    "project": "PLAN-TECH Workshop — Steam Jacket",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Fabrication Team",
    "auditeeDept": "Fabrication",
    "refDoc": "ISO 9001:2015 Cl.7.1.5",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Steam Jacket line (100-SCL-4A10-BAB4-NI): Fabrication team failed to notify QC for fit-up inspection. Soluble welding spacer was missed — not installed before fit-up.",
    "objEvidence": "Fit-up performed without QC notification. QC inspection gate missed. Soluble spacer not present in completed fit-up — confirmed during post-activity inspection.",
    "rcaCat": "Process Gap",
    "rca": "Lack of formal communication protocol between fabrication and QC teams. MOS did not mandate QC notification before fit-up activities.",
    "corrAction": "1. Mandate QC notification as a Hold Point before any fit-up activity. 2. Train team on communication protocols. 3. Add QC notification as verification step in MOS.",
    "corrBy": "Fabrication Supervisor / QC Lead",
    "prevAction": "Fit-up QC Hold Point added to all fabrication ITPs. Fabrication team briefed on mandatory QC sign-off before fit-up proceeds.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "31-Dec-2024",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-4",
    "ref": "DEC-2024-03",
    "dt": "10-Dec-2024",
    "project": "PLAN-TECH Workshop — United Furnace-2",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Welder / Fabrication",
    "auditeeDept": "Fabrication",
    "refDoc": "ISO 9001:2015 Cl.8.7.1",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Non-compliant weld joint (N16) at United Furnace-2: welder left purging nozzle inside pipe during welding, causing internal obstruction and potential contamination of weld.",
    "objEvidence": "Post-weld inspection of N16: purging nozzle found lodged inside pipe. Weld completed over obstruction. Joint rejected — failed visual and dimensional inspection.",
    "rcaCat": "Training",
    "rca": "1. Lack of awareness of the welder. 2. Lack of adherence to procedure. 3. Inadequate training/awareness on pre-weld checklist requirements.",
    "corrAction": "1. Provide welder training conducted by fabrication team for all welding personnel. 2. Conduct awareness toolbox talks and refresher training sessions. 3. Perform inspections during welding setup to ensure compliance.",
    "corrBy": "Fabrication TL / Welding Supervisor",
    "prevAction": "Pre-weld setup checklist introduced — includes purging equipment removal confirmation as mandatory step before arc initiation.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "14-Jan-2025",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-5",
    "ref": "NCR-AR-01",
    "dt": "04-Oct-2025",
    "project": "AR-RAZI TA",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Fabrication / Projects Team",
    "auditeeDept": "Projects",
    "refDoc": "Approved ITP / QC Documentation",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Fabrication team proceeded with cutting an additional joint in the piping package without obtaining prior recommendation/authorization or communicating with PTA QC and PTA planning. Unauthorized modification to approved scope.",
    "objEvidence": "Site QC log: additional joint cutting performed on date without QC/planning authorization. No MWR or work permit raised for the additional scope.",
    "rcaCat": "Process Gap",
    "rca": "Miscommunication between parties. No formal authorization process followed before scope modification. Fabrication team assumed verbal instruction was sufficient.",
    "corrAction": "All site work scope changes must be documented in QC records before any cutting or modification. QC sign-off mandatory before any scope modification proceeds.",
    "corrBy": "Projects Lead — AR-RAZI",
    "prevAction": "Scope change authorization process formalized: written authorization + QC sign-off required before any field modifications beyond approved scope.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "04-Mar-2026",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-6",
    "ref": "NCR-AR-02",
    "dt": "19-Oct-2025",
    "project": "AR-RAZI TA — Tank TK-1501",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Site Supervisor / Fabrication",
    "auditeeDept": "Projects",
    "refDoc": "Approved ITP — Hold Point",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Tank TK-1501 cleaning activities executed without adherence to approved ITP. Site supervisor proceeded without notifying or involving QC for the required pre-inspection Hold Point. Post-cleaning inspection requested after all activities already completed.",
    "objEvidence": "ITP for TK-1501: pre-cleaning inspection = Hold Point (QC sign-off mandatory). QC daily report: no sign-off obtained before cleaning. Site supervisor confirmed activities completed before QC involvement.",
    "rcaCat": "Process Gap",
    "rca": "Lack of communication. Lack of process awareness from site supervisor. Hold Point requirements not properly briefed before activity commencement.",
    "corrAction": "For future jobs, site supervisor to obtain QC signature before proceeding with any ITP Hold Point activity. Operation authorization form to be used for such instructions.",
    "corrBy": "Projects Lead — AR-RAZI",
    "prevAction": "Pre-TA briefing updated to include explicit explanation of Hold Point obligations. Site supervisor sign-off on ITP briefing form required.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "04-Mar-2026",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-7",
    "ref": "NCR-AR-03",
    "dt": "21-Oct-2025",
    "project": "AR-RAZI TA — V-1221",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Fabrication Team",
    "auditeeDept": "Projects",
    "refDoc": "Approved Inspection Report",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "During repair activities on V-1221, fabricator performed unauthorized punching and grinding on a cladded shell area not identified in the approved inspection report. QC clearance given based on verbal confirmation without cross-checking the approved inspection report or markings.",
    "objEvidence": "Approved inspection report for V-1221 does not identify the cladded area as requiring repair. Physical evidence of unauthorized grinding marks on cladded surface confirmed by QC.",
    "rcaCat": "Process Gap",
    "rca": "QC clearance given verbally without cross-referencing approved documentation. No physical verification against inspection report markings before work commenced.",
    "corrAction": "Physical verification of inspection marks required against inspection report in presence of QC engineer before any grinding or punching activity on vessels.",
    "corrBy": "Projects Lead — AR-RAZI",
    "prevAction": "Vessel repair procedure updated: all areas to be clearly marked and cross-referenced to approved inspection report before any physical work commences.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "04-Mar-2026",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-8",
    "ref": "NCR-AR-04",
    "dt": "21-Oct-2025",
    "project": "AR-RAZI TA — V-1221",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Fabrication Team",
    "auditeeDept": "Projects",
    "refDoc": "Approved Repair Plan / ITP",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "During repair activities on V-1221, fabricator deviated from documented repair plan due to misinterpretation of old grinder marks from a previous shutdown, which were mistakenly assumed to be current defect indicators. Unauthorized punching and grinding executed without proper verification or clearance.",
    "objEvidence": "Old grinder marks from prior shutdown mistaken for current defect marking. Repair executed on non-identified area. Deviation from approved repair plan confirmed by QC and site records.",
    "rcaCat": "Human Error",
    "rca": "Improper reporting between teams. Old grinder marks not cleaned/removed after previous shutdown, causing misinterpretation. No verification step before commencing repair on marks.",
    "corrAction": "Physical verification of inspection marks must be cross-checked with inspection report in presence of QC engineer before any activity. Old marks to be cleaned and re-marked clearly before each TA.",
    "corrBy": "Projects Lead / Fabrication Team",
    "prevAction": "Awareness session to be given before every TA to make documentation verification a culture. Vessel surface to be cleaned of old marks and re-marked with current defect identification before TA commencement.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Accepted & Closed",
    "verifiedBy": "MANOBALA Rajendran",
    "verifiedDate": "04-Mar-2026",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Closed"
  },
  {
    "id": "ncrstores-1788689476844-9",
    "ref": "NCR-IED-FEB-2026-02",
    "dt": "03-Jul-2026",
    "project": "Maaden PAU — Fabrication",
    "raisedBy": "MANOBALA Rajendran (QAQC)",
    "auditeeName": "Welder: Santhosh Kumar",
    "auditeeDept": "Fabrication",
    "refDoc": "PQR / Weld Quality Requirements",
    "auditeeEmail": "",
    "classification": "NCR",
    "obSubType": "",
    "desc": "Macro Test revealed slag inclusion in the weld performed by Santhosh Kumar. This is the second recorded incident — PQR coupon has been rejected. Issue attributed to improper welding technique and insufficient inter-pass cleaning, compromising product conformity.",
    "objEvidence": "Macro test results: slag inclusion visible. Second rejection for same welder. PQR coupon rejected by inspection. Inter-pass cleaning not performed per WPS requirements.",
    "rcaCat": "Training",
    "rca": "Improper welding technique by welder. Insufficient inter-pass cleaning between weld passes. Repeat offense indicates training not retained from first incident.",
    "corrAction": "PQR coupon rejected. Welder Santhosh Kumar suspended from further welding activity pending retraining and re-qualification. New coupon to be welded by qualified welder.",
    "corrBy": "MANOBALA Rajendran — IED Manager",
    "prevAction": "Welder re-qualification mandatory before return to work. All welders on Maaden PAU to receive inter-pass cleaning refresher before resuming. QC inspection at each pass for this welder's future work.",
    "prevBy": "MANOBALA Rajendran — MR",
    "finalDecision": "Open",
    "verifiedBy": "",
    "verifiedDate": "",
    "createdAt": "2026-09-06T10:11:16.844Z",
    "updatedAt": "2026-09-06T10:11:16.844Z",
    "status": "Open"
  }
];

export const useNCRStore = create<NCRStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('ncr');
        const now = new Date().toISOString();
        const record: NCRRecord = {
          ...data,
          id,
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ records: [record, ...state.records] }));

        useAuditStore.getState().log(
          'create',
          'ncr',
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
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: now } : r
          ),
        }));

        useAuditStore.getState().log(
          'update',
          'ncr',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, reason) => {
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
          'ncr',
          id,
          existing.status,
          status,
          reason
        );
      },

      transitionStatus: (id, to, by, reason, kind) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const historyEntry: NCRStateHistoryEntry = {
          from: existing.status,
          to,
          by,
          at: now,
          reason,
          kind,
        };

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? { ...r, status: to, updatedAt: now, stateHistory: [...(r.stateHistory ?? []), historyEntry] }
              : r
          ),
        }));

        useAuditStore.getState().log(
          'status_change',
          'ncr',
          id,
          existing.status,
          to,
          reason
        );
      },

      approveNCR: (id, approver, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];
        const reason = comments || 'NCR verified and closed by MR';

        const historyEntry: NCRStateHistoryEntry = {
          from: existing.status,
          to: 'Closed',
          by: approver,
          at: now,
          reason,
          kind: 'verify',
        };

        const updatedFields: Partial<NCRRecord> = {
          status: 'Closed',
          approvedBy: approver,
          approvalDate: todayStr,
          approvalComments: comments ?? '',
          finalDecision: 'Accepted & Closed',
          verifiedBy: existing.verifiedBy || approver,
          verifiedDate: existing.verifiedDate || todayStr,
          updatedAt: now,
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'approve',
          'ncr',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          reason
        );
      },

      rejectNCR: (id, rejector, comments) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];
        const reason = comments || 'NCR rejected by MR (returned to CAPA)';

        const historyEntry: NCRStateHistoryEntry = {
          from: existing.status,
          to: 'CAPA_InProgress',
          by: rejector,
          at: now,
          reason,
          kind: 'reject',
        };

        const updatedFields: Partial<NCRRecord> = {
          status: 'CAPA_InProgress',
          rejectedBy: rejector,
          rejectionDate: todayStr,
          rejectionReason: comments ?? '',
          updatedAt: now,
          stateHistory: [...(existing.stateHistory ?? []), historyEntry],
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updatedFields } : r)),
        }));

        useAuditStore.getState().log(
          'reject',
          'ncr',
          id,
          JSON.stringify({ status: existing.status }),
          JSON.stringify(updatedFields),
          reason
        );
      },

      archiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, isArchived: true, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log(
          'archive',
          'ncr',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? false }),
          JSON.stringify({ isArchived: true }),
          'NCR archived'
        );
      },

      unarchiveRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, isArchived: false, updatedAt: now } : r)),
        }));
        useAuditStore.getState().log(
          'unarchive',
          'ncr',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'NCR unarchived'
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
        useAuditStore.getState().log('delete', 'ncr', id, JSON.stringify(existing), undefined);
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'ncr',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useNCRStore' }
  )
);
