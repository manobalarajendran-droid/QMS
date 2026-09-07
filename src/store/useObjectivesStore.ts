import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from './useAuditStore';
import { generateRecordId } from '../lib/idGenerator';
import type { ObjectiveRecord, ObjectiveRecordStatus } from '../types';

export type { ObjectiveRecord, ObjectiveRecordStatus } from '../types';

// ── Store ────────────────────────────────────────────────────────────────────

export interface ObjectivesStoreState {
  records: ObjectiveRecord[];
  addRecord: (data: Omit<ObjectiveRecord, 'id' | 'createdAt' | 'updatedAt'>) => ObjectiveRecord;
  updateRecord: (id: string, data: Partial<Omit<ObjectiveRecord, 'id' | 'createdAt'>>) => void;
  updateStatus: (id: string, status: ObjectiveRecordStatus, remarks?: string) => void;
  deleteRecord: (id: string) => void;
  archiveRecord: (id: string) => void;
  unarchiveRecord: (id: string) => void;
  toggleArchive: (id: string) => void;
  setRecords: (records: ObjectiveRecord[]) => void;
}

const SEED_DATA: ObjectiveRecord[] = [
  {
    "id": "objectivesstores-1788689476847-0",
    "yr": "2025",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED-1",
    "desc": "100% PSSR compliance for all piping packages in planned turnarounds",
    "kpi": "100% PSSR checklist completion rate",
    "owner": "IED Asst. Manager",
    "deadline": "01-May-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "PSSR checklists deployed and completed for all TA projects.",
    "evidence": "Yes",
    "remarks": "Completed Q2 2025.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-1",
    "yr": "2025",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED-2",
    "desc": "Reduce hold point violations by 50% via pre-TA awareness sessions",
    "kpi": "≥50% reduction in hold point violations",
    "owner": "IED Team Leader",
    "deadline": "31-Dec-2025",
    "status": "In Progress",
    "pct": 50,
    "actual": "Pre-TA briefings conducted. Violation rate tracking started.",
    "evidence": "Partial",
    "remarks": "NCR-AR-02 (TK-1501) and NCR-AR-07 indicate violations still occurring. Ongoing.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-2",
    "yr": "2025",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED-3",
    "desc": "Qualify Monel PQR/WPS by end of 2025 — 100% target",
    "kpi": "1 approved PQR + WPS (Monel)",
    "owner": "IED Asst. Manager",
    "deadline": "31-Dec-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "Monel PQR/WPS qualified and submitted.",
    "evidence": "Yes",
    "remarks": "TCR Arabia developed. Completed.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-3",
    "yr": "2025",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED-4",
    "desc": "Achieve ≥65% first-time acceptance rate on R-Stamp repair docs from AIA",
    "kpi": "≥65% first-time AIA acceptance rate",
    "owner": "IED Asst. Manager",
    "deadline": "31-Dec-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "R-Stamp documentation process improved. First-time acceptance target met.",
    "evidence": "Yes",
    "remarks": "Completed.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-4",
    "yr": "2025",
    "dept": "Projects",
    "ref": "R-02",
    "objId": "PRJ-1",
    "desc": "Quarterly feedback from ≥80% visit-visa employees; 90% retention of top performers; min 2 trainings/quarter",
    "kpi": "80% feedback rate; 90% retention; 2 trainings/qtr",
    "owner": "Project Leaders / Managers",
    "deadline": "Dec-2025",
    "status": "In Progress",
    "pct": 0,
    "actual": "Partially initiated. Tracking not fully established.",
    "evidence": "Partial",
    "remarks": "Ongoing — not fully implemented.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-5",
    "yr": "2025",
    "dept": "Projects",
    "ref": "R-02",
    "objId": "PRJ-2",
    "desc": "Monitor & reduce project expenses using Primavera — expense ratio reports for EDC/MTBE TAs",
    "kpi": "Reports generated for 100% applicable projects",
    "owner": "Sr. Project Manager",
    "deadline": "Dec-2025",
    "status": "In Progress",
    "pct": 0,
    "actual": "Primavera reporting initiated for some projects.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.847Z",
    "updatedAt": "2026-09-06T10:11:16.847Z"
  },
  {
    "id": "objectivesstores-1788689476847-6",
    "yr": "2025",
    "dept": "OSD",
    "ref": "R-03",
    "objId": "OSD-1",
    "desc": "Reduce reliance on rental equipment — reduce own equipment downtime by ≥25%",
    "kpi": "≥25% reduction in own-equipment downtime",
    "owner": "Asst. OSD Manager",
    "deadline": "Dec-2025/26",
    "status": "Ongoing",
    "pct": 30,
    "actual": "Equipment overhaul program in progress.",
    "evidence": "Partial",
    "remarks": "Continuing into 2026.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-7",
    "yr": "2025",
    "dept": "OSD",
    "ref": "R-03",
    "objId": "OSD-2",
    "desc": "Major overhauls for ≥50% of equipment older than 10 years",
    "kpi": "≥50% of fleet >10yrs with completed overhaul",
    "owner": "Asst. OSD Manager",
    "deadline": "Dec-2025",
    "status": "In Progress",
    "pct": 40,
    "actual": "Overhaul schedule prepared. 40% completed.",
    "evidence": "Partial",
    "remarks": "In progress.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-8",
    "yr": "2025",
    "dept": "OSD",
    "ref": "R-03",
    "objId": "OSD-3",
    "desc": "100% GPS installation on all diesel-operated equipment",
    "kpi": "100% of diesel fleet fitted with functional GPS",
    "owner": "Asst. OSD Manager",
    "deadline": "Sep-2025",
    "status": "In Progress",
    "pct": 70,
    "actual": "70% of fleet GPS-fitted as of last update.",
    "evidence": "Partial",
    "remarks": "In progress — 30% remaining.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-9",
    "yr": "2025",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT-1",
    "desc": "Upgrade Camp CCTV — replace 82 old cameras, install 88 new (total 170), upgrade NVR, go-live by Mar 2025",
    "kpi": "170 cameras operational; NVR upgraded",
    "owner": "IT Administrator",
    "deadline": "Mar-2025",
    "status": "In Progress",
    "pct": 80,
    "actual": "80% cameras installed and commissioned.",
    "evidence": "Partial",
    "remarks": "20% remaining.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-10",
    "yr": "2025",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT-2",
    "desc": "Install & configure new ERP server — hardware, installation, migration, testing",
    "kpi": "ERP server live; 100% data migrated",
    "owner": "IT Administrator",
    "deadline": "Mar-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "ERP server live. Data migrated.",
    "evidence": "Yes",
    "remarks": "Delivery Note on file.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-11",
    "yr": "2025",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT-3",
    "desc": "Migrate data from current NAS to new NAS system",
    "kpi": "100% data migrated; permissions verified; zero data loss",
    "owner": "IT Administrator",
    "deadline": "Mar-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "NAS migration complete. Permissions verified.",
    "evidence": "Yes",
    "remarks": "Email confirmation on file.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-12",
    "yr": "2025",
    "dept": "Facility",
    "ref": "R-05",
    "objId": "FAC-1",
    "desc": "Camp extension — increase accommodation from 240 to 840 (max 2,454 employees). 70 portacabins constructed.",
    "kpi": "840 beds + utilities + firefighting operational",
    "owner": "Facility TL / Manager",
    "deadline": "Jun-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "840 beds operational with utilities and firefighting.",
    "evidence": "Partial",
    "remarks": "Completed.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-13",
    "yr": "2025",
    "dept": "Facility",
    "ref": "R-05",
    "objId": "FAC-2",
    "desc": "Extend washrooms — 45 bathrooms + 45 toilets",
    "kpi": "45 bathrooms + 45 toilets operational",
    "owner": "Facility TL / Manager",
    "deadline": "Jun-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "Washroom extension complete.",
    "evidence": "Partial",
    "remarks": "Completed.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-14",
    "yr": "2025",
    "dept": "Facility",
    "ref": "R-05",
    "objId": "FAC-3",
    "desc": "Extend camp mess hall from 200 to 600 pax in-dine capacity",
    "kpi": "600-pax mess hall operational with all utilities",
    "owner": "Camp Manager",
    "deadline": "Dec-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "Mess hall extension complete.",
    "evidence": "Partial",
    "remarks": "Completed.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-15",
    "yr": "2025",
    "dept": "Procurement",
    "ref": "R-06",
    "objId": "PRC-1",
    "desc": "Achieve 95% on-time delivery rate for all procured materials within 12 months",
    "kpi": "≥95% on-time delivery rate (monthly tracked)",
    "owner": "PRC Dept. Head",
    "deadline": "Dec-2025",
    "status": "Ongoing",
    "pct": 50,
    "actual": "Delivery rate monitoring in progress.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-16",
    "yr": "2025",
    "dept": "Procurement",
    "ref": "R-06",
    "objId": "PRC-2",
    "desc": "Reduce procurement cycle time by 15% within 6 months",
    "kpi": "≥15% reduction in avg cycle time",
    "owner": "PRC Lead & Officers",
    "deadline": "Dec-2025",
    "status": "Ongoing",
    "pct": 40,
    "actual": "Cycle time reduction initiatives in progress.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-17",
    "yr": "2025",
    "dept": "Procurement",
    "ref": "R-06",
    "objId": "PRC-3",
    "desc": "≥50% of procured materials from Saudi suppliers with Local Content Certificate score >10",
    "kpi": "≥50% spend from LC-certified Saudi suppliers",
    "owner": "PRC Dept. / Legal",
    "deadline": "Dec-2025",
    "status": "Ongoing",
    "pct": 30,
    "actual": "LC supplier identification in progress.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-18",
    "yr": "2025",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR-1",
    "desc": "Increase min/max inventory levels by 15%; procure BA materials, torquing tools, rigging equipment",
    "kpi": "15% inventory increase; new materials stocked",
    "owner": "Store In-charge",
    "deadline": "30-Nov-2025",
    "status": "Ongoing",
    "pct": 40,
    "actual": "Partial inventory increase achieved.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-19",
    "yr": "2025",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR-2",
    "desc": "Install GI fence barricading in camp store for secure material protection",
    "kpi": "GI fence installed and commissioned",
    "owner": "Store In-charge",
    "deadline": "30-Nov-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "GI fence installed.",
    "evidence": "Yes",
    "remarks": "Pictures available.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-20",
    "yr": "2025",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR-3",
    "desc": "Construct shed with racks at camp store to protect hoses and electrical items",
    "kpi": "Shed + racks constructed and operational",
    "owner": "Store In-charge",
    "deadline": "31-Dec-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "Shed + racks constructed.",
    "evidence": "Yes",
    "remarks": "Pictures available.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-21",
    "yr": "2025",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR-4",
    "desc": "Construct shed at Main Store to protect project mobilisation & inspection materials",
    "kpi": "Main Store shed constructed and operational",
    "owner": "Store In-charge",
    "deadline": "31-Dec-2025",
    "status": "Completed",
    "pct": 100,
    "actual": "Main Store shed constructed.",
    "evidence": "Yes",
    "remarks": "Pictures available.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-22",
    "yr": "2025",
    "dept": "P&E",
    "ref": "R-08/10",
    "objId": "PE-1",
    "desc": "Implement register for sub-contracted/rental/supply services for all awarded projects — updated after each job completion",
    "kpi": "Register operational; 100% of completed projects captured",
    "owner": "Sr. Manager P&E",
    "deadline": "2025",
    "status": "Ongoing",
    "pct": 30,
    "actual": "Register format under development.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-23",
    "yr": "2025",
    "dept": "HR",
    "ref": "R-09",
    "objId": "HR-1",
    "desc": "Develop & implement company-wide KPI system — pilot with QC and Fabrication departments by end of Q3",
    "kpi": "KPI framework live; pilot depts operational by Sep-2025",
    "owner": "HR Dept",
    "deadline": "30-Sep-2025",
    "status": "Ongoing",
    "pct": 30,
    "actual": "KPI framework partially developed.",
    "evidence": "Partial",
    "remarks": "Ongoing — linked to quality objectives tracking.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-24",
    "yr": "2025",
    "dept": "HR",
    "ref": "R-09",
    "objId": "HR-2",
    "desc": "Enhance L&D framework — skill gap analysis by Q3, updated training modules + 100% staff participation by Q4",
    "kpi": "100% employee in ≥1 learning program annually",
    "owner": "HR Dept",
    "deadline": "31-Dec-2025",
    "status": "Ongoing",
    "pct": 20,
    "actual": "Skill gap analysis initiated.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-25",
    "yr": "2025",
    "dept": "HR",
    "ref": "R-09",
    "objId": "HR-3",
    "desc": "Define optimum staff requirements for each department — starting with support departments",
    "kpi": "Staffing model for all departments approved",
    "owner": "HR Dept",
    "deadline": "31-Dec-2025",
    "status": "Ongoing",
    "pct": 10,
    "actual": "Not yet started for most departments.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-26",
    "yr": "2025",
    "dept": "HR",
    "ref": "R-09",
    "objId": "HR-4",
    "desc": "Identify root causes of employee turnover spike; implement retention strategies to reduce resignation by 70%",
    "kpi": "≥70% reduction in resignation rate vs baseline",
    "owner": "HR Dept",
    "deadline": "31-Dec-2025",
    "status": "Ongoing",
    "pct": 20,
    "actual": "Root cause analysis initiated.",
    "evidence": "Partial",
    "remarks": "Ongoing.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-27",
    "yr": "2026",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED26-1",
    "desc": "Make Pre-TA and Post-TA QC Dossier mandatory for 100% of turnaround projects. Baseline: 0% compliance in 2025 TAs.",
    "kpi": "Dossier format approved by 01-Mar-2026; 100% compliance across all TA projects by Dec-2026",
    "owner": "IED Manager (MANOBALA)",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 30,
    "actual": "Dossier format developed and approved. Pilot on IBN ZAHR TA 2026.",
    "evidence": "Partial",
    "remarks": "Format PT-QCR-DOSSIER-01 approved. Rolling out to all TAs.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-28",
    "yr": "2026",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED26-2",
    "desc": "Reduce ITP hold point violations by at least 50% compared to 2025 baseline through pre-TA briefings and timely ITP/WPS approval",
    "kpi": "≤50% of 2025 baseline violation count by 31-Dec-2026",
    "owner": "IED Team Leader (Thowheed)",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 25,
    "actual": "2025 baseline data being compiled. Pre-TA briefings conducted for IBN ZAHR and AR-RAZI.",
    "evidence": "Partial",
    "remarks": "ITP sign-off records, pre-TA attendance registers being maintained.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-29",
    "yr": "2026",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED26-3",
    "desc": "Complete National Board R-Stamp registration and become direct Saudi Aramco approved vendor for repair activities",
    "kpi": "Registration package submitted by 30-Jun-2026; Aramco vendor audit completed",
    "owner": "IED Manager (MANOBALA)",
    "deadline": "31-Dec-2026",
    "status": "Not Started",
    "pct": 0,
    "actual": "Q1 assessment in progress.",
    "evidence": "No",
    "remarks": "NBIC consultant to be engaged Q1. Aramco submission target Q2.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-30",
    "yr": "2026",
    "dept": "IED / QAQC",
    "ref": "R-01",
    "objId": "IED26-4",
    "desc": "Create digital system to track rework and mid-TA scope changes — achieve ≥30% reduction in rework incidents vs 2025",
    "kpi": "Tracking system live by 31-Mar-2026; ≥30% reduction by 31-Dec-2026",
    "owner": "IED Team Leader",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 20,
    "actual": "Google Sheets registers being developed for rework and scope change tracking.",
    "evidence": "Partial",
    "remarks": "System development in Q1. Training IED team.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-31",
    "yr": "2026",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT26-1",
    "desc": "Upgrade and migrate existing IT Inventory Management Application to reduce manual data entry errors and improve accuracy",
    "kpi": "Upgraded system deployed and stabilized by 30-Oct-2026",
    "owner": "IT Administrator & IT Team",
    "deadline": "30-Oct-2026",
    "status": "In Progress",
    "pct": 20,
    "actual": "Current system assessed. Requirements gathered. FRD in preparation.",
    "evidence": "Partial",
    "remarks": "System uptime monitoring to be implemented post-deployment.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-32",
    "yr": "2026",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT26-2",
    "desc": "Commission new production server as Backup Domain Controller (BDC) to strengthen organizational IT resilience",
    "kpi": "BDC commissioned and validated by 30-Oct-2026; system uptime monitored",
    "owner": "IT Administrator & IT Team",
    "deadline": "30-Oct-2026",
    "status": "In Progress",
    "pct": 15,
    "actual": "Infrastructure assessment done. Hardware procurement in progress.",
    "evidence": "Partial",
    "remarks": "System uptime and availability to be monitored via server monitoring tools.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-33",
    "yr": "2026",
    "dept": "IT",
    "ref": "R-04",
    "objId": "IT26-3",
    "desc": "Establish and implement documented Disaster Recovery (DR) framework to ensure business continuity",
    "kpi": "DR framework documented and periodic recovery testing conducted",
    "owner": "IT Administrator & IT Team",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 10,
    "actual": "Critical systems identified. RTO/RPO being defined.",
    "evidence": "Partial",
    "remarks": "Restoration test results, backup reports to be used as evidence.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-34",
    "yr": "2026",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR26-1",
    "desc": "Achieve ≥98% ERP Inventory Accuracy by 31-Dec-2026 — physical stock variance vs ERP records ≤2%",
    "kpi": "≥98% accuracy; quarterly cycle counts conducted",
    "owner": "ASM / Store TL",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 25,
    "actual": "Quarterly cycle counts initiated. ERP accuracy monitoring in progress.",
    "evidence": "Partial",
    "remarks": "Stock Min/Max List PT/STR/10 being used. Target: ≥98%.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-35",
    "yr": "2026",
    "dept": "Store",
    "ref": "R-07",
    "objId": "STR26-2",
    "desc": "Increase inventory capacity for critical shutdown tools and materials from 2 sites to full coverage",
    "kpi": "100% capacity increase by Dec-2026 with quarterly milestones",
    "owner": "ASM / Store TL",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 25,
    "actual": "Q1 milestone: 25%. Inventory gap analysis completed.",
    "evidence": "Partial",
    "remarks": "Budget approval obtained. Warehouse storage in Abu-Hadriya being utilized.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-36",
    "yr": "2026",
    "dept": "P&E",
    "ref": "R-08/10",
    "objId": "PE26-1",
    "desc": "Improve accuracy and efficiency of material cost estimation during bidding by maintaining updated price register for permanent materials",
    "kpi": "Price register live and used for ≥90% of bids; estimation accuracy improvement tracked",
    "owner": "Planning & Estimation Sr. Manager / Manager / Lead",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 20,
    "actual": "Standard price register format under development. Bid preparation log maintained.",
    "evidence": "Partial",
    "remarks": "Register format being finalized. Bid log maintained by Lead Engineer.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-37",
    "yr": "2026",
    "dept": "Projects",
    "ref": "R-02",
    "objId": "PRJ26-1",
    "desc": "Ensure weekly Project execution progress reviews are conducted 100% for all active projects. Compliance tracked via weekly meeting attendance/minutes log maintained by Project Manager and reported monthly to Sr. Project Manager.",
    "kpi": "100% of active projects have documented weekly review meetings. Monthly report to Sr. PM.",
    "owner": "Sr. Project Manager",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 20,
    "actual": "Weekly meetings conducted — formal documentation being established. Baseline: meetings happen informally; formalisation started.",
    "evidence": "Partial",
    "remarks": "Weekly milestone checklist + meeting minutes to be maintained per project. Critical path review mandatory.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-38",
    "yr": "2026",
    "dept": "Projects",
    "ref": "R-02",
    "objId": "PRJ26-2",
    "desc": "Ensure 100% of completed projects conduct a documented lessons-learned review, and that findings are formally acknowledged at the kickoff of the next project to prevent recurrence of identified issues.",
    "kpi": "100% of completed projects have documented lessons-learned report. Findings referenced at next project kickoff.",
    "owner": "Sr. Project Manager",
    "deadline": "31-Dec-2026",
    "status": "In Progress",
    "pct": 15,
    "actual": "Lessons-learned process being formalised. Recurring issues tracking system not yet in place — being developed.",
    "evidence": "Partial",
    "remarks": "Assign responsibility per project. Archive in centralised system. Share across project teams at kickoffs.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-39",
    "yr": "2026",
    "dept": "OSD",
    "ref": "R-03",
    "objId": "OSD26-PENDING",
    "desc": "[PENDING SUBMISSION — Objectives not yet received from OSD Department]",
    "kpi": "Awaiting HOD submission",
    "owner": "OSD Manager",
    "deadline": "",
    "status": "Pending Submission",
    "pct": 0,
    "actual": "",
    "evidence": "No",
    "remarks": "Send reminder to OSD Manager. Required for MRM-2026-01.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-40",
    "yr": "2026",
    "dept": "Facility",
    "ref": "R-05",
    "objId": "FAC26-PENDING",
    "desc": "[PENDING SUBMISSION — Objectives not yet received from Facility Department]",
    "kpi": "Awaiting HOD submission",
    "owner": "Facility Manager (Anoop)",
    "deadline": "",
    "status": "Pending Submission",
    "pct": 0,
    "actual": "",
    "evidence": "No",
    "remarks": "Send reminder to Facility Manager. Required for MRM-2026-01.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-41",
    "yr": "2026",
    "dept": "Procurement",
    "ref": "R-06",
    "objId": "PRC26-PENDING",
    "desc": "[PENDING SUBMISSION — Objectives not yet received from Procurement Department]",
    "kpi": "Awaiting HOD submission",
    "owner": "PRC Dept. Head",
    "deadline": "",
    "status": "Pending Submission",
    "pct": 0,
    "actual": "",
    "evidence": "No",
    "remarks": "Send reminder to Procurement HOD. Required for MRM-2026-01.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  },
  {
    "id": "objectivesstores-1788689476848-42",
    "yr": "2026",
    "dept": "HR",
    "ref": "R-09",
    "objId": "HR26-PENDING",
    "desc": "[PENDING SUBMISSION — Objectives not yet received from HR Department]",
    "kpi": "Awaiting HOD submission",
    "owner": "HR Manager (Mubashir)",
    "deadline": "",
    "status": "Pending Submission",
    "pct": 0,
    "actual": "",
    "evidence": "No",
    "remarks": "Send reminder to HR Manager. Required for MRM-2026-01.",
    "createdAt": "2026-09-06T10:11:16.848Z",
    "updatedAt": "2026-09-06T10:11:16.848Z"
  }
];

export const useObjectivesStore = create<ObjectivesStoreState>()(
  persist(
    (set, get) => ({
      records: SEED_DATA,

      addRecord: (data) => {
        const id = generateRecordId('obj');
        const now = new Date().toISOString();
        const record: ObjectiveRecord = {
          ...data,
          id,
          status: data.status || 'Not Started',
          isArchived: data.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ records: [record, ...state.records] }));

        useAuditStore.getState().log(
          'create',
          'objective',
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
        const updated: ObjectiveRecord = {
          ...existing,
          ...data,
          updatedAt: now,
        };

        set((state) => ({
          records: state.records.map((r) => (r.id === id ? updated : r)),
        }));

        useAuditStore.getState().log(
          'update',
          'objective',
          id,
          JSON.stringify(existing),
          JSON.stringify(data)
        );
      },

      updateStatus: (id, status, remarks) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();

        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  remarks: remarks ?? r.remarks,
                  pct: status === 'Achieved' || status === 'Completed' ? 100 : r.pct,
                  updatedAt: now,
                }
              : r
          ),
        }));

        useAuditStore.getState().log(
          'status_change',
          'objective',
          id,
          existing.status,
          status,
          remarks
        );
      },

      deleteRecord: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        useAuditStore.getState().log(
          'delete',
          'objective',
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
          'objective',
          id,
          JSON.stringify({ isArchived: existing.isArchived }),
          JSON.stringify({ isArchived: true }),
          'Archived objective'
        );
      },

      toggleArchive: (id) => {
        const existing = get().records.find((r) => r.id === id);
        if (!existing) return;
        const now = new Date().toISOString();
        const nextArchived = !existing.isArchived;
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isArchived: nextArchived, updatedAt: now } : r
          ),
        }));
        useAuditStore.getState().log(
          nextArchived ? 'archive' : 'unarchive',
          'objective',
          id,
          JSON.stringify({ isArchived: existing.isArchived }),
          JSON.stringify({ isArchived: nextArchived }),
          nextArchived ? 'Archived objective' : 'Unarchived objective'
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
          'objective',
          id,
          JSON.stringify({ isArchived: existing.isArchived ?? true }),
          JSON.stringify({ isArchived: false }),
          'Unarchived objective'
        );
      },

      setRecords: (records) => {
        set({ records });
        useAuditStore.getState().log(
          'import',
          'objective',
          'batch',
          undefined,
          JSON.stringify({ count: records.length })
        );
      },
    }),
    { name: 'qatrial:useObjectivesStore' }
  )
);
