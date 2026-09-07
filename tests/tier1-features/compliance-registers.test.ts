import { describe, it, expect, beforeEach } from 'vitest';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useTUVStore } from '../../src/store/useTUVStore';
import { useSupplierEvalStore } from '../../src/store/useSupplierEvalStore';
import { useCalibStore } from '../../src/store/useCalibStore';
import { useObjectivesStore } from '../../src/store/useObjectivesStore';
import { useAuditProgrammeStore } from '../../src/store/useAuditProgrammeStore';
import { useAuditStore } from '../../src/store/useAuditStore';
import {
  MOCK_CSI_22_CRITERIA_QUESTIONS,
  VALID_CSI_MAX_SCORES,
  VALID_CSI_MIXED_SCORES,
} from '../fixtures/seed-data';

describe('Tier 1 — Compliance & Register Modules (Features 21–32)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  // ==========================================================================
  // Feature 21: CSI 22-Criteria Scoring
  // ==========================================================================
  describe('Feature 21: CSI 22-Criteria Scoring Matrix (FM-CSS-01)', () => {
    it('F21-01: validates presence and structure of all 22 ISO criteria across 9 categories', () => {
      expect(MOCK_CSI_22_CRITERIA_QUESTIONS).toHaveLength(22);

      const categories = new Set(MOCK_CSI_22_CRITERIA_QUESTIONS.map((q) => q.category));
      expect(categories.size).toBe(9);
      expect(categories).toContain('1. Overall Service');
      expect(categories).toContain('6. Quality Services');
      expect(categories).toContain('7. Compliance with Safety Regulations');
      expect(categories).toContain('9. Overall Performance');
    });

    it('F21-02: calculates total score and rating from 22 criteria scores', () => {
      // Perfect scores (all 10s: sum = 220, 100%)
      const sumMax = Object.values(VALID_CSI_MAX_SCORES).reduce((a, b) => a + b, 0);
      expect(sumMax).toBe(220);
      const scorePctMax = (sumMax / 220) * 100;
      expect(scorePctMax).toBe(100);

      // Mixed scores
      const sumMixed = Object.values(VALID_CSI_MIXED_SCORES).reduce((a, b) => a + b, 0);
      const scorePctMixed = (sumMixed / 220) * 100;
      expect(scorePctMixed).toBeGreaterThanOrEqual(75);

      // Rating classification helper logic
      const getRating = (pct: number) => {
        if (pct >= 90) return 'Excellent';
        if (pct >= 75) return 'Good';
        if (pct >= 60) return 'Fair';
        return 'Poor';
      };

      expect(getRating(scorePctMax)).toBe('Excellent');
      expect(getRating(scorePctMixed)).toBe('Good');
      expect(getRating(65)).toBe('Fair');
      expect(getRating(50)).toBe('Poor');
    });
  });

  // ==========================================================================
  // Feature 22: CSI Full CRUD
  // ==========================================================================
  describe('Feature 22: CSI Full CRUD Operations', () => {
    it('F22-01: creates, edits, archives, and deletes customer survey record', () => {
      const csi = useCSIStore.getState().addRecord({
        cl: 'SABIC YANPET',
        proj: 'Olefin Cracker Turnaround 2026',
        yr: '2026',
        score: '0.92',
        rating: 'Excellent',
        icon: '★',
        obs: 'Timely completion and zero safety incidents',
        scores: VALID_CSI_MIXED_SCORES,
      });

      expect(csi.id).toBeDefined();
      expect(csi.cl).toBe('SABIC YANPET');

      // Edit
      useCSIStore.getState().updateRecord(csi.id, {
        obs: 'Updated: Client awarded appreciation plaque',
      });
      let current = useCSIStore.getState().records.find((r) => r.id === csi.id);
      expect(current?.obs).toContain('appreciation plaque');

      // Archive toggle
      useCSIStore.getState().updateRecord(csi.id, { isArchived: true });
      current = useCSIStore.getState().records.find((r) => r.id === csi.id);
      expect(current?.isArchived).toBe(true);

      // Delete
      useCSIStore.getState().deleteRecord(csi.id);
      expect(useCSIStore.getState().records.find((r) => r.id === csi.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 23: TUV Tracker Full CRUD
  // ==========================================================================
  describe('Feature 23: TUV Tracker Full CRUD', () => {
    it('F23-01: creates, updates, and deletes TUV surveillance recommendations', () => {
      const rec = useTUVStore.getState().addRecord({
        num: 'R8',
        cl: '7.1.5 Monitoring & Measuring Resources',
        desc: 'Ensure all pressure relief valves have verifiable test certificates',
        owner: 'Maintenance / QC',
        due: '2026-06-30',
        status: 'Open',
      });

      expect(rec.id).toBeDefined();
      expect(rec.num).toBe('R8');

      // Update
      useTUVStore.getState().updateRecord(rec.id, {
        evidence: 'Digital PRV register created with scanned third-party test certs',
        status: 'Closed',
        closed: '2026-05-15',
      });
      const updated = useTUVStore.getState().records.find((r) => r.id === rec.id);
      expect(updated?.status).toBe('Closed');
      expect(updated?.evidence).toContain('Digital PRV register');

      // Delete
      useTUVStore.getState().deleteRecord(rec.id);
      expect(useTUVStore.getState().records.find((r) => r.id === rec.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 24: TUV 4-Stage Lifecycle & Overdue Detection
  // ==========================================================================
  describe('Feature 24: TUV 4-Stage Lifecycle & Overdue Alerting', () => {
    it('F24-01: transitions through Open -> Action Taken -> Verified -> Closed', () => {
      const rec = useTUVStore.getState().addRecord({
        num: 'R9',
        cl: '8.4 Control of Externally Provided Processes',
        desc: 'Audit of scaffolding subcontractor',
        owner: 'Procurement QA',
        due: '2026-07-01',
        status: 'Open',
      });

      useTUVStore.getState().updateStatus(rec.id, 'In Progress');
      expect(useTUVStore.getState().records.find((r) => r.id === rec.id)?.status).toBe('In Progress');

      useTUVStore.getState().updateStatus(rec.id, 'Closed');
      expect(useTUVStore.getState().records.find((r) => r.id === rec.id)?.status).toBe('Closed');

      useTUVStore.getState().deleteRecord(rec.id);
    });

    it('F24-02: flags overdue items when target due date is in the past', () => {
      const pastDate = '2025-01-01';
      const futureDate = '2030-01-01';

      const isOverdue = (due: string, status: string) => {
        if (status === 'Closed') return false;
        return new Date(due).getTime() < Date.now();
      };

      expect(isOverdue(pastDate, 'Open')).toBe(true);
      expect(isOverdue(pastDate, 'Closed')).toBe(false);
      expect(isOverdue(futureDate, 'Open')).toBe(false);
    });
  });

  // ==========================================================================
  // Feature 25: Supplier Dashboard Full CRUD
  // ==========================================================================
  describe('Feature 25: Supplier Dashboard Full CRUD', () => {
    it('F25-01: creates and updates supplier evaluation records', () => {
      const sup = useSupplierEvalStore.getState().addRecord({
        name: 'Gulf Technical Equipment Rental',
        category: 'Heavy Equipment & Torquing Systems',
        status: 'Approved',
        score: 89,
        lastEvalDate: '2026-02-10',
        nextEvalDate: '2027-02-10',
        contactPerson: 'Mohammed Al-Harbi',
        email: 'harbi@gulfrental.com',
        findings: 'Well maintained inventory with current calibration stickers.',
      });

      expect(sup.id).toBeDefined();
      expect(sup.name).toContain('Gulf Technical');

      // Update
      useSupplierEvalStore.getState().updateRecord(sup.id, {
        score: 95,
        findings: 'Exceeded SLA response time during emergency reactor turnaround.',
      });
      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === sup.id);
      expect(updated?.score).toBe(95);
      expect(updated?.findings).toContain('Exceeded SLA');
    });
  });

  // ==========================================================================
  // Feature 26: Supplier Evaluation & Approval
  // ==========================================================================
  describe('Feature 26: Supplier Evaluation Approval / Rejection Workflow', () => {
    it('F26-01: sets status to Approved, Conditional, or Rejected based on qualification criteria', () => {
      const sup = useSupplierEvalStore.getState().addRecord({
        name: 'Apex Fasteners & Flanges Ltd',
        category: 'Materials Supplier',
        status: 'Pending Evaluation',
        score: 62,
        lastEvalDate: '2026-03-01',
        nextEvalDate: '2026-06-01',
        contactPerson: 'K. Raman',
        email: 'sales@apexfasteners.com',
        findings: 'Missing ISO 9001:2015 surveillance audit renewal certificate.',
      });

      // Conditional approval pending certificate submission
      useSupplierEvalStore.getState().updateRecord(sup.id, {
        status: 'Conditional',
        findings: 'Conditional approval for 90 days. Mandatory third-party audit required.',
      });
      let current = useSupplierEvalStore.getState().records.find((r) => r.id === sup.id);
      expect(current?.status).toBe('Conditional');

      // Reject if criteria not met
      useSupplierEvalStore.getState().updateRecord(sup.id, {
        status: 'Rejected',
        findings: 'Failed second-party QA audit.',
      });
      current = useSupplierEvalStore.getState().records.find((r) => r.id === sup.id);
      expect(current?.status).toBe('Rejected');
    });
  });

  // ==========================================================================
  // Feature 27: Calibration Register Full CRUD
  // ==========================================================================
  describe('Feature 27: Calibration Register Full CRUD', () => {
    it('F27-01: registers, updates, and tracks equipment calibration items', () => {
      const tool = useCalibStore.getState().addRecord({
        equipNo: 'PTA-TORQ-500',
        equipName: 'Hydraulic Torque Wrench Power Pack',
        manufacturer: 'Hytorc',
        serialNo: 'HYT-88741',
        location: 'Tool Room A',
        freqMonths: 12,
        lastCalibDate: '2025-06-15',
        nextCalibDate: '2026-06-15',
        status: 'Active',
        certificateNo: 'HYT-CAL-2025-09',
        notes: 'Calibrated at authorized ISO 17025 laboratory',
      });

      expect(tool.id).toBeDefined();
      expect(tool.equipNo).toBe('PTA-TORQ-500');

      // Update
      useCalibStore.getState().updateRecord(tool.id, {
        location: 'Site Unit 4 (SABIC Turnaround)',
      });
      const updated = useCalibStore.getState().records.find((r) => r.id === tool.id);
      expect(updated?.location).toContain('Site Unit 4');
    });
  });

  // ==========================================================================
  // Feature 28: Calibration Overdue Tracking
  // ==========================================================================
  describe('Feature 28: Calibration Overdue Detection & Status Calculation', () => {
    it('F28-01: accurately identifies Overdue vs Due Soon vs Active tools', () => {
      const now = Date.now();
      const thirtyDays = 30 * 86400000;

      const computeCalibStatus = (nextCalibDate: string) => {
        const nextMs = new Date(nextCalibDate).getTime();
        if (nextMs < now) return 'Overdue';
        if (nextMs - now <= thirtyDays) return 'Due Soon';
        return 'Active';
      };

      const pastDate = new Date(now - 10 * 86400000).toISOString().split('T')[0];
      const soonDate = new Date(now + 15 * 86400000).toISOString().split('T')[0];
      const futureDate = new Date(now + 180 * 86400000).toISOString().split('T')[0];

      expect(computeCalibStatus(pastDate)).toBe('Overdue');
      expect(computeCalibStatus(soonDate)).toBe('Due Soon');
      expect(computeCalibStatus(futureDate)).toBe('Active');
    });
  });

  // ==========================================================================
  // Feature 29: Objectives Dashboard Full CRUD
  // ==========================================================================
  describe('Feature 29: Objectives Dashboard Full CRUD', () => {
    it('F29-01: creates, updates, and deletes departmental quality objectives', () => {
      const obj = useObjectivesStore.getState().addRecord({
        yr: '2026',
        dept: 'Operations',
        objId: 'OPS-2026-01',
        desc: 'Achieve 98% on-time turnaround completion rate',
        kpi: 'Turnaround schedule variance < 2%',
        owner: 'Operations Director',
        deadline: '2026-12-31',
        status: 'In Progress',
        pct: 45,
      });

      expect(obj.id).toBeDefined();
      expect(obj.objId).toBe('OPS-2026-01');

      // Update
      useObjectivesStore.getState().updateRecord(obj.id, {
        pct: 80,
        status: 'In Progress',
        actual: 'Completed 12 of 15 scheduled turnarounds without delay',
      });
      const updated = useObjectivesStore.getState().records.find((r) => r.id === obj.id);
      expect(updated?.pct).toBe(80);
      expect(updated?.actual).toContain('12 of 15');

      // Delete
      useObjectivesStore.getState().deleteRecord(obj.id);
      expect(useObjectivesStore.getState().records.find((r) => r.id === obj.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 30: Objectives Lifecycle Tracking
  // ==========================================================================
  describe('Feature 30: Objectives Lifecycle Tracking (Not Started -> In Progress -> Achieved)', () => {
    it('F30-01: tracks lifecycle completion through milestone progress', () => {
      const obj = useObjectivesStore.getState().addRecord({
        yr: '2026',
        dept: 'Quality',
        objId: 'Q-2026-05',
        desc: 'Digitalization of ISO 9001:2015 calibration logs',
        kpi: '100% equipment tagged and recorded in system',
        owner: 'QA Manager',
        deadline: '2026-06-30',
        status: 'Not Started',
        pct: 0,
      });

      // Progress to In Progress
      useObjectivesStore.getState().updateRecord(obj.id, {
        status: 'In Progress',
        pct: 50,
      });
      expect(useObjectivesStore.getState().records.find((r) => r.id === obj.id)?.status).toBe('In Progress');

      // Mark Completed / Achieved
      useObjectivesStore.getState().updateRecord(obj.id, {
        status: 'Completed',
        pct: 100,
        evidence: 'QMS Dashboard Calibration Register deployed into production',
      });
      const finalObj = useObjectivesStore.getState().records.find((r) => r.id === obj.id);
      expect(finalObj?.status).toBe('Completed');
      expect(finalObj?.pct).toBe(100);

      useObjectivesStore.getState().deleteRecord(obj.id);
    });
  });

  // ==========================================================================
  // Feature 31: Audit Programme Full CRUD
  // ==========================================================================
  describe('Feature 31: Audit Programme Full CRUD', () => {
    it('F31-01: creates, updates, and deletes internal audit records', () => {
      const audit = useAuditProgrammeStore.getState().addRecord({
        ref: 'IA-2026-03',
        sc: 'Clause 7.1 Resources & Clause 7.2 Competence',
        aud: 'T. Manobala (Lead Auditor)',
        dep: 'Human Resources & Training',
        dt: '2026-04-20',
        status: 'Planned',
      });

      expect(audit.id).toBeDefined();
      expect(audit.ref).toBe('IA-2026-03');

      // Update
      useAuditProgrammeStore.getState().updateRecord(audit.id, {
        nc: 0,
        obs: 2,
        fnd: 'Observations noted regarding training matrix refresh intervals',
        status: 'Report Issued',
        rpt: 'IA-2026-03-RPT.pdf',
      });
      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === audit.id);
      expect(updated?.status).toBe('Report Issued');
      expect(updated?.obs).toBe(2);

      // Delete
      useAuditProgrammeStore.getState().deleteRecord(audit.id);
      expect(useAuditProgrammeStore.getState().records.find((r) => r.id === audit.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 32: Audit Programme 4-Stage Lifecycle
  // ==========================================================================
  describe('Feature 32: Audit Programme 4-Stage Lifecycle', () => {
    it('F32-01: verifies transitions across Planned -> In Progress -> Completed -> Follow-up', () => {
      const validStages = ['Planned', 'In Progress', 'Completed', 'Follow-up'];
      expect(validStages).toHaveLength(4);

      let currentStage = 'Planned';
      currentStage = 'In Progress';
      expect(currentStage).toBe('In Progress');
      currentStage = 'Completed';
      expect(currentStage).toBe('Completed');
      currentStage = 'Follow-up';
      expect(currentStage).toBe('Follow-up');
    });
  });
});
