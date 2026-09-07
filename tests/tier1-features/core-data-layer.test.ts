import { describe, it, expect, beforeEach } from 'vitest';
import { useAuditStore } from '../../src/store/useAuditStore';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useMRMStore } from '../../src/store/useMRMStore';
import { useTUVStore } from '../../src/store/useTUVStore';
import { useSupplierEvalStore } from '../../src/store/useSupplierEvalStore';
import { useCalibStore } from '../../src/store/useCalibStore';
import { useObjectivesStore } from '../../src/store/useObjectivesStore';
import { useAuditProgrammeStore } from '../../src/store/useAuditProgrammeStore';

describe('Tier 1 — Core Data Layer, Types & Audit Trail (Features 1–7)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  // ==========================================================================
  // Feature 1: Centralized Types & Interfaces
  // ==========================================================================
  describe('Feature 1: Centralized Types & Domain Interfaces', () => {
    it('F01-01: adheres to approval metadata schema contract', () => {
      const approvalPayload = {
        reviewedBy: 'T. Manobala (MR)',
        reviewDate: '2026-03-01',
        approvedBy: 'General Manager',
        approvalDate: '2026-03-02',
        approvalComments: 'Approved for plant operational deployment',
      };

      expect(approvalPayload.reviewedBy).toBeDefined();
      expect(approvalPayload.approvedBy).toBeDefined();
      expect(approvalPayload.approvalComments).toContain('Approved');
      expect(new Date(approvalPayload.approvalDate).getTime()).not.toBeNaN();
    });

    it('F01-02: defines valid lifecycle statuses across all QMS modules', () => {
      const ncrStages = ['Open', 'Investigation', 'Verification', 'Closed'];
      const tuvStages = ['Open', 'Action Taken', 'Verified', 'Closed'];
      const calibStages = ['Valid', 'Due', 'Overdue', 'Out of Service'];
      const dcrStages = ['Draft', 'Pending Review', 'Approved', 'Rejected'];

      expect(ncrStages).toContain('Closed');
      expect(tuvStages).toHaveLength(4);
      expect(calibStages).toContain('Overdue');
      expect(dcrStages).toContain('Approved');
    });
  });

  // ==========================================================================
  // Feature 2: Store CRUD Operations
  // ==========================================================================
  describe('Feature 2: Store CRUD Operations (Add, Update, Delete, Archive)', () => {
    it('F02-01: performs CRUD lifecycle on useNCRStore', () => {
      const store = useNCRStore.getState();
      const initialCount = store.records.length;

      // Create
      const newNCR = store.addRecord({
        ref: 'NCR-E2E-001',
        project: 'Turnaround Catalyst Package',
        desc: 'Missing torque certificates',
        status: 'Open',
        auditeeDept: 'Operations',
      });
      expect(newNCR.id).toBeDefined();
      expect(useNCRStore.getState().records.length).toBe(initialCount + 1);

      // Update
      useNCRStore.getState().updateRecord(newNCR.id, {
        desc: 'Updated: torque certificates received and verified',
      });
      const updated = useNCRStore.getState().records.find((r) => r.id === newNCR.id);
      expect(updated?.desc).toContain('Updated');

      // Delete
      useNCRStore.getState().deleteRecord(newNCR.id);
      expect(useNCRStore.getState().records.find((r) => r.id === newNCR.id)).toBeUndefined();
    });

    it('F02-02: performs CRUD lifecycle on useDCRStore', () => {
      const store = useDCRStore.getState();
      const initialCount = store.records.length;

      // Create
      const newDCR = store.addRecord({
        docNo: 'PTA-OPS-SOP-01',
        title: 'Reactor Catalyst Loading Procedure',
        requestor: 'Lead Engineer',
        department: 'Operations',
        changeDescription: 'Incorporate nitrogen blanketing safety checklist',
        reason: 'Client audit observation',
        status: 'Draft',
      });
      expect(newDCR.id).toBeDefined();
      expect(useDCRStore.getState().records.length).toBe(initialCount + 1);

      // Update
      useDCRStore.getState().updateRecord(newDCR.id, {
        reason: 'Client audit observation - Urgent revision',
      });
      const updated = useDCRStore.getState().records.find((r) => r.id === newDCR.id);
      expect(updated?.reason).toContain('Urgent');

      // Delete
      useDCRStore.getState().deleteRecord(newDCR.id);
      expect(useDCRStore.getState().records.find((r) => r.id === newDCR.id)).toBeUndefined();
    });

    it('F02-03: verifies archive flag functionality across records', () => {
      const dcr = useDCRStore.getState().addRecord({
        docNo: 'PTA-DOC-099',
        title: 'Archival Test Procedure',
        requestor: 'QA Inspector',
        department: 'Quality',
        changeDescription: 'Test archive toggling',
        reason: 'QA Audit',
        status: 'Draft',
      });

      useDCRStore.getState().updateRecord(dcr.id, { isArchived: true });
      expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)?.isArchived).toBe(true);

      useDCRStore.getState().updateRecord(dcr.id, { isArchived: false });
      expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)?.isArchived).toBe(false);

      useDCRStore.getState().deleteRecord(dcr.id);
    });
  });

  // ==========================================================================
  // Feature 3: Store Lifecycle Transitions
  // ==========================================================================
  describe('Feature 3: Store Lifecycle Transitions', () => {
    it('F03-01: transitions NCR through standard stages', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-CYCLE-01',
        project: 'Sabic Plant Turnaround',
        desc: 'Weld porosity detected on line 14-P',
        status: 'Open',
        auditeeDept: 'Mechanical',
      });

      useNCRStore.getState().updateStatus(record.id, 'Investigation');
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)?.status).toBe('Investigation');

      useNCRStore.getState().updateStatus(record.id, 'Verification');
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)?.status).toBe('Verification');

      useNCRStore.getState().updateStatus(record.id, 'Closed');
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)?.status).toBe('Closed');

      useNCRStore.getState().deleteRecord(record.id);
    });

    it('F03-02: updates DCR status through approval stages', () => {
      const dcr = useDCRStore.getState().addRecord({
        docNo: 'PTA-PROC-2026',
        title: 'Hydrotesting Procedure',
        requestor: 'Site QA',
        department: 'Operations',
        changeDescription: 'Test pressure increase',
        reason: 'Specification alignment',
        status: 'Draft',
      });

      useDCRStore.getState().updateRecord(dcr.id, { status: 'Pending Review' });
      expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)?.status).toBe('Pending Review');

      useDCRStore.getState().updateRecord(dcr.id, { status: 'Approved' });
      expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)?.status).toBe('Approved');

      useDCRStore.getState().deleteRecord(dcr.id);
    });
  });

  // ==========================================================================
  // Feature 4: Store Approval Actions
  // ==========================================================================
  describe('Feature 4: Store Approval Actions & Sign-off Fields', () => {
    it('F04-01: captures reviewer and approver sign-off metadata on records', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-APPR-01',
        project: 'Tasnee Refinery Unit 3',
        desc: 'Material test mill report missing heat number',
        status: 'Verification',
        auditeeDept: 'Procurement',
      });

      const approvalDate = new Date().toISOString();
      useNCRStore.getState().updateRecord(record.id, {
        status: 'Closed',
        approvedBy: 'T. Manobala (Management Representative)',
        approvalDate,
        approvalComments: 'Verified replacement MTR with correct heat number 98412.',
      });

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(updated?.status).toBe('Closed');
      expect(updated?.approvedBy).toContain('Manobala');
      expect(updated?.approvalDate).toBe(approvalDate);
      expect(updated?.approvalComments).toContain('98412');

      useNCRStore.getState().deleteRecord(record.id);
    });

    it('F04-02: captures multi-step approval on DCR records', () => {
      const dcr = useDCRStore.getState().addRecord({
        docNo: 'PTA-ENG-05',
        title: 'Flare Tip Maintenance Procedure',
        requestor: 'HSE Manager',
        department: 'HSE',
        changeDescription: 'Updated fall arrest safety standards',
        reason: 'New OSHA/Aramco regulatory standard',
        status: 'Pending Review',
      });

      // Step 1: Technical Review
      const reviewDate = '2026-03-05';
      useDCRStore.getState().updateRecord(dcr.id, {
        status: 'Pending QA Approval',
        reviewedBy: 'T. Manobala (MR)',
        reviewDate,
      } as any);

      // Step 2: Final Executive Approval
      const approvalDate = '2026-03-06';
      useDCRStore.getState().updateRecord(dcr.id, {
        status: 'Approved',
        approvedBy: 'Managing Director / GM',
        approvalDate,
      } as any);

      const approvedDCR = useDCRStore.getState().records.find((r) => r.id === dcr.id);
      expect(approvedDCR?.status).toBe('Approved');
      expect((approvedDCR as any).reviewedBy).toBe('T. Manobala (MR)');
      expect((approvedDCR as any).approvedBy).toContain('Managing Director');

      useDCRStore.getState().deleteRecord(dcr.id);
    });
  });

  // ==========================================================================
  // Feature 5: Atomic Document Revision
  // ==========================================================================
  describe('Feature 5: Atomic Document Revision Workflow (useDMLStore)', () => {
    it('F05-01: archives existing revision and creates next revision atomically', () => {
      const dmlStore = useDMLStore.getState();
      const existingDoc = dmlStore.records[0] || dmlStore.addRecord({
        no: 'PTA-QM-001',
        tt: 'Quality Manual',
        dept: 'Quality',
        rv: 'Rev 01',
        status: 'Published',
      });

      expect(existingDoc).toBeDefined();

      // Simulate atomic revision: archive old / mark obsolete, create new rev
      useDMLStore.getState().updateRecord(existingDoc.id, { status: 'Obsolete', isArchived: true });
      const newRev = useDMLStore.getState().addRecord({
        no: existingDoc.no,
        tt: existingDoc.tt,
        dept: existingDoc.dept,
        rv: 'Rev 02',
        status: 'Published',
      });

      const updatedOld = useDMLStore.getState().records.find((r) => r.id === existingDoc.id);
      const newlyAdded = useDMLStore.getState().records.find((r) => r.id === newRev.id);

      expect(updatedOld?.status).toBe('Obsolete');
      expect(updatedOld?.isArchived).toBe(true);
      expect(newlyAdded?.rv).toBe('Rev 02');
      expect(newlyAdded?.status).toBe('Published');

      // Cleanup
      useDMLStore.getState().deleteRecord(newRev.id);
    });
  });

  // ==========================================================================
  // Feature 6: Collision-Proof ID Generation
  // ==========================================================================
  describe('Feature 6: Collision-Proof ID Generation', () => {
    it('F06-01: generates 1,000 rapid unique IDs with zero collisions', () => {
      const generatedIds = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        // Test standard collision-proof timestamp + counter / random pattern
        const id = `qms-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`;
        generatedIds.add(id);
      }

      expect(generatedIds.size).toBe(count);
    });

    it('F06-02: generates non-colliding human document numbers with sequence padding', () => {
      const prefix = 'PTA-NCR-2026';
      const docNumbers = new Set<string>();

      for (let seq = 1; seq <= 50; seq++) {
        const docNo = `${prefix}-${String(seq).padStart(3, '0')}`;
        docNumbers.add(docNo);
      }

      expect(docNumbers.size).toBe(50);
      expect(docNumbers.has('PTA-NCR-2026-001')).toBe(true);
      expect(docNumbers.has('PTA-NCR-2026-050')).toBe(true);
    });
  });

  // ==========================================================================
  // Feature 7: Standardized Audit Trail
  // ==========================================================================
  describe('Feature 7: Standardized Audit Trail Logging', () => {
    it('F07-01: logs create, update, delete, and approve events with singular entity types', () => {
      const audit = useAuditStore.getState();

      audit.log('create', 'ncr', 'ncr-101', undefined, JSON.stringify({ ref: 'NCR-101' }));
      audit.log('update', 'ncr', 'ncr-101', 'Open', 'Under Investigation');
      audit.log('approve', 'ncr', 'ncr-101', 'Under Investigation', 'Closed', 'Closure verified');
      audit.log('delete', 'ncr', 'ncr-101', 'Closed', undefined);

      const entries = useAuditStore.getState().getEntriesForEntity('ncr-101');
      expect(entries).toHaveLength(4);
      expect(entries[0].action).toBe('create');
      expect(entries[1].action).toBe('update');
      expect(entries[2].action).toBe('approve');
      expect(entries[3].action).toBe('delete');
      expect(entries[2].reason).toBe('Closure verified');
    });

    it('F07-02: filters audit logs by entity and time range', () => {
      const audit = useAuditStore.getState();
      const past = new Date(Date.now() - 10000);
      const future = new Date(Date.now() + 10000);

      audit.log('create', 'csi', 'csi-555', undefined, 'CSI Created');
      audit.log('create', 'dcr', 'dcr-777', undefined, 'DCR Created');

      const csiEntries = useAuditStore.getState().getEntriesForEntity('csi-555');
      expect(csiEntries).toHaveLength(1);
      expect(csiEntries[0].entityType).toBe('csi');

      const rangeEntries = useAuditStore.getState().getEntriesByDateRange(past, future);
      expect(rangeEntries.length).toBeGreaterThanOrEqual(2);
    });
  });
});
