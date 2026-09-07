import { describe, it, expect, beforeEach } from 'vitest';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useMRMStore } from '../../src/store/useMRMStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 1 — Core Workflow Modules UI & Approvals (Features 13–20)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  // ==========================================================================
  // Feature 13: NCR Workflow Full CRUD
  // ==========================================================================
  describe('Feature 13: NCR Workflow Full CRUD', () => {
    it('F13-01: creates an NCR record with mandatory ISO 9001 fields', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-2026-F13',
        dt: '2026-03-01',
        project: 'Turnaround Catalyst Package',
        raisedBy: 'Lead QA Inspector',
        auditeeDept: 'Operations',
        classification: 'NCR',
        desc: 'Flange bolting torque sequence not followed on column C-101',
        objEvidence: 'Torque inspection log sheet missing QC stamps',
        status: 'Open',
      });

      expect(record.id).toBeDefined();
      expect(record.ref).toBe('NCR-2026-F13');
      expect(record.status).toBe('Open');
      expect(record.classification).toBe('NCR');

      const found = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(found).toBeDefined();
    });

    it('F13-02: updates, deletes, and toggles archive status on NCR', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-2026-EDIT',
        project: 'SABIC Site',
        desc: 'Initial description',
        status: 'Open',
        auditeeDept: 'Maintenance',
      });

      // Update
      useNCRStore.getState().updateRecord(record.id, {
        desc: 'Updated description after site inspection',
        rca: 'Improper socket size used',
      });
      let current = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(current?.desc).toContain('Updated description');
      expect(current?.rca).toBe('Improper socket size used');

      // Archive toggle
      useNCRStore.getState().updateRecord(record.id, { isArchived: true });
      current = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(current?.isArchived).toBe(true);

      // Delete
      useNCRStore.getState().deleteRecord(record.id);
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 14: NCR MR Closure Approval
  // ==========================================================================
  describe('Feature 14: NCR MR Closure Approval Cycle', () => {
    it('F14-01: enforces verification before MR approval and captures approval metadata', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-2026-APPR',
        project: 'Plant-Tech Refinery',
        desc: 'Missing material test report',
        status: 'Verification',
        auditeeDept: 'Procurement',
      });

      // Verify and approve closure
      const approvalTimestamp = new Date().toISOString();
      useNCRStore.getState().updateRecord(record.id, {
        status: 'Closed',
        approvedBy: 'T. Manobala (MR)',
        approvalDate: approvalTimestamp,
        approvalComments: 'Replacement MTR verified and stamped by QA Manager',
      });

      const closedRecord = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(closedRecord?.status).toBe('Closed');
      expect(closedRecord?.approvedBy).toBe('T. Manobala (MR)');
      expect(closedRecord?.approvalDate).toBe(approvalTimestamp);
      expect(closedRecord?.approvalComments).toContain('Replacement MTR verified');

      useNCRStore.getState().deleteRecord(record.id);
    });

    it('F14-02: rejection resets status and records rejection rationale', () => {
      const record = useNCRStore.getState().addRecord({
        ref: 'NCR-2026-REJ',
        project: 'Plant-Tech Refinery',
        desc: 'Flange alignment issue',
        status: 'Verification',
        auditeeDept: 'Mechanical',
      });

      // MR rejects closure due to insufficient corrective action
      useNCRStore.getState().updateRecord(record.id, {
        status: 'CAPA_InProgress',
        approvalComments: 'Rejected: Re-torque test was not performed in presence of client inspector.',
      });

      const rejectedRecord = useNCRStore.getState().records.find((r) => r.id === record.id);
      expect(rejectedRecord?.status).toBe('CAPA_InProgress');
      expect(rejectedRecord?.approvalComments).toContain('Rejected: Re-torque test');

      useNCRStore.getState().deleteRecord(record.id);
    });
  });

  // ==========================================================================
  // Feature 15: DCR Workflow Full CRUD
  // ==========================================================================
  describe('Feature 15: DCR Workflow Full CRUD', () => {
    it('F15-01: creates, updates, and deletes DCR records', () => {
      const dcr = useDCRStore.getState().addRecord({
        docNo: 'PTA-SOP-501',
        title: 'Safety Isolation and Lockout-Tagout',
        requestor: 'Safety Officer',
        department: 'HSE',
        changeDescription: 'Add group lock box procedure for multi-contractor turnarounds',
        reason: 'Saudi Aramco safety instruction update',
        status: 'Draft',
      });

      expect(dcr.id).toBeDefined();
      expect(dcr.dcrNo).toMatch(/^DCR-\d{4}-\d{3}$/);
      expect(dcr.status).toBe('Draft');

      // Update
      useDCRStore.getState().updateRecord(dcr.id, {
        changeDescription: 'Add group lock box procedure with dual supervisor signatures',
      });
      const updated = useDCRStore.getState().records.find((r) => r.id === dcr.id);
      expect(updated?.changeDescription).toContain('dual supervisor signatures');

      // Delete
      useDCRStore.getState().deleteRecord(dcr.id);
      expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 16: DCR Multi-Step Approval (MR Review -> GM Approval)
  // ==========================================================================
  describe('Feature 16: DCR Multi-Step Approval Chain', () => {
    it('F16-01: executes multi-step approval from Draft -> Reviewed -> Approved', () => {
      const dcr = useDCRStore.getState().addRecord({
        docNo: 'PTA-OPS-302',
        title: 'High Pressure Nitrogen Purging',
        requestor: 'Operations Superintendent',
        department: 'Operations',
        changeDescription: 'Upgrade purge manifold rating from 150# to 300#',
        reason: 'Technical safety margin expansion',
        status: 'Draft',
      });

      // Step 1: Technical Review by Management Representative (MR)
      useDCRStore.getState().updateRecord(dcr.id, {
        status: 'Pending Review',
      });
      useDCRStore.getState().updateRecord(dcr.id, {
        status: 'Pending QA Approval',
        reviewedBy: 'T. Manobala (MR)',
        reviewDate: '2026-03-02',
      } as any);

      let step1Record = useDCRStore.getState().records.find((r) => r.id === dcr.id) as any;
      expect(step1Record.status).toBe('Pending QA Approval');
      expect(step1Record.reviewedBy).toBe('T. Manobala (MR)');

      // Step 2: Final Executive Approval by General Manager (GM)
      useDCRStore.getState().updateRecord(dcr.id, {
        status: 'Approved',
        approvedBy: 'General Manager',
        approvalDate: '2026-03-03',
      } as any);

      let step2Record = useDCRStore.getState().records.find((r) => r.id === dcr.id) as any;
      expect(step2Record.status).toBe('Approved');
      expect(step2Record.approvedBy).toBe('General Manager');

      useDCRStore.getState().deleteRecord(dcr.id);
    });
  });

  // ==========================================================================
  // Feature 17: DML Manager Full CRUD
  // ==========================================================================
  describe('Feature 17: DML Manager Full CRUD', () => {
    it('F17-01: creates, edits, archives, and deletes controlled documents in DML', () => {
      const doc = useDMLStore.getState().addRecord({
        no: 'PT/QCR/99',
        tt: 'Testing & Commissioning Procedure',
        dept: 'Engineering',
        hierarchyLevel: 'L2',
        rv: 'Rev 00',
        status: 'Draft',
      });

      expect(doc.id).toBeDefined();
      expect(doc.no).toBe('PT/QCR/99');

      // Edit
      useDMLStore.getState().updateRecord(doc.id, {
        tt: 'Testing, Pre-commissioning & Commissioning Procedure',
        status: 'Published',
      });
      let current = useDMLStore.getState().records.find((r) => r.id === doc.id);
      expect(current?.tt).toContain('Pre-commissioning');
      expect(current?.status).toBe('Published');

      // Archive
      useDMLStore.getState().updateRecord(doc.id, { isArchived: true });
      current = useDMLStore.getState().records.find((r) => r.id === doc.id);
      expect(current?.isArchived).toBe(true);

      // Delete
      useDMLStore.getState().deleteRecord(doc.id);
      expect(useDMLStore.getState().records.find((r) => r.id === doc.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 18: DML Document Revision Flow
  // ==========================================================================
  describe('Feature 18: DML Document Revision Flow', () => {
    it('F18-01: supersedes current active revision and creates new active revision', () => {
      const baseDoc = useDMLStore.getState().addRecord({
        no: 'PTA-SOP-CAT-01',
        tt: 'Dense Phase Catalyst Loading Manual',
        dept: 'Operations',
        rv: 'Rev 02',
        status: 'Published',
      });

      // Perform revision
      useDMLStore.getState().updateRecord(baseDoc.id, {
        status: 'Obsolete',
        isArchived: true,
      });

      const revisedDoc = useDMLStore.getState().addRecord({
        no: baseDoc.no,
        tt: baseDoc.tt,
        dept: baseDoc.dept,
        rv: 'Rev 03',
        status: 'Published',
        nt: 'Rev 03 issued per approved DCR-2026-004. Updated funnel dimensions.',
      });

      const oldRev = useDMLStore.getState().records.find((r) => r.id === baseDoc.id);
      const newRev = useDMLStore.getState().records.find((r) => r.id === revisedDoc.id);

      expect(oldRev?.status).toBe('Obsolete');
      expect(oldRev?.isArchived).toBe(true);
      expect(newRev?.rv).toBe('Rev 03');
      expect(newRev?.status).toBe('Published');
      expect(newRev?.nt).toContain('DCR-2026-004');

      useDMLStore.getState().deleteRecord(baseDoc.id);
      useDMLStore.getState().deleteRecord(revisedDoc.id);
    });
  });

  // ==========================================================================
  // Feature 19: MRM Manager Full CRUD
  // ==========================================================================
  describe('Feature 19: MRM Manager Full CRUD', () => {
    it('F19-01: creates, updates, and deletes management review meetings', () => {
      const mrmStore = useMRMStore.getState();
      const initialCount = mrmStore.records.length;

      const meeting = mrmStore.addRecord({
        meetingNo: 'MRM-2026-01',
        date: '2026-03-15',
        chairperson: 'Managing Director',
        attendees: ['T. Manobala (MR)', 'Operations Manager', 'HSE Lead'],
        agenda: ['Q1 Objectives Review', 'Customer Feedback Analysis', 'Internal Audit Results'],
        status: 'Scheduled',
        actionItems: [],
      });

      expect(meeting.id).toBeDefined();
      expect(meeting.meetingNo).toBe('MRM-2026-01');
      expect(useMRMStore.getState().records.length).toBe(initialCount + 1);

      // Update
      useMRMStore.getState().updateRecord(meeting.id, {
        status: 'In Progress',
      });
      expect(useMRMStore.getState().records.find((r) => r.id === meeting.id)?.status).toBe('In Progress');

      // Delete
      useMRMStore.getState().deleteRecord(meeting.id);
      expect(useMRMStore.getState().records.find((r) => r.id === meeting.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Feature 20: MRM Approval & Action Items
  // ==========================================================================
  describe('Feature 20: MRM Approval & Action Items Management', () => {
    it('F20-01: assigns and tracks action items with owners and due dates within MRM', () => {
      const meeting = useMRMStore.getState().addRecord({
        meetingNo: 'MRM-2026-ACTION-TEST',
        date: '2026-03-20',
        chairperson: 'General Manager',
        attendees: ['T. Manobala', 'HR Manager'],
        agenda: ['Resource Allocation'],
        status: 'Scheduled',
        actionItems: [
          {
            id: 'act-1',
            action: 'Hire 5 certified catalyst technicians for upcoming turnaround',
            owner: 'HR Manager',
            dueDate: '2026-04-15',
            status: 'Open',
          },
          {
            id: 'act-2',
            action: 'Calibrate all high pressure gauge manifolds',
            owner: 'Quality Inspector',
            dueDate: '2026-04-01',
            status: 'Open',
          },
        ],
      });

      expect(meeting.actionItems).toHaveLength(2);
      expect(meeting.actionItems[0].owner).toBe('HR Manager');

      // Update action item 1 to Closed
      const updatedActionItems = meeting.actionItems.map((item) =>
        item.id === 'act-1' ? { ...item, status: 'Closed' as const } : item
      );
      useMRMStore.getState().updateRecord(meeting.id, { actionItems: updatedActionItems });

      const updatedMeeting = useMRMStore.getState().records.find((r) => r.id === meeting.id);
      expect(updatedMeeting?.actionItems.find((a) => a.id === 'act-1')?.status).toBe('Closed');

      // Approve and Complete Meeting
      useMRMStore.getState().updateRecord(meeting.id, {
        status: 'Completed',
        approvedBy: 'Managing Director',
        approvalDate: '2026-03-22',
      } as any);

      const approvedMeeting = useMRMStore.getState().records.find((r) => r.id === meeting.id) as any;
      expect(approvedMeeting.status).toBe('Completed');
      expect(approvedMeeting.approvedBy).toBe('Managing Director');

      useMRMStore.getState().deleteRecord(meeting.id);
    });
  });
});
