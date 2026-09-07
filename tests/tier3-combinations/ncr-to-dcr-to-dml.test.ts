import { describe, it, expect, beforeEach } from 'vitest';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 3 — Cross-Feature Combinations: NCR -> DCR -> DML Revision -> Audit Log', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  it('T3-FLOW-01: complete cross-module corrective action: finding -> DCR -> DML revision -> audit trail', () => {
    // Stage 1: Quality non-conformance identified during plant operation
    const ncr = useNCRStore.getState().addRecord({
      ref: 'NCR-2026-XFLOW',
      project: 'Yanbu Petrochemical Unit 5',
      desc: 'Incomplete isolation tagging during blind flange insertion',
      status: 'Open',
      auditeeDept: 'Operations',
      classification: 'NCR',
    });

    expect(ncr.id).toBeDefined();

    // Stage 2: Root cause analysis identifies procedure gap, raising a DCR
    useNCRStore.getState().updateRecord(ncr.id, {
      status: 'Investigation',
      rca: 'Procedure PTA-SOP-OPS-12 did not mandate dual-tagging for positive isolation',
      corrAction: 'Initiate DCR to revise PTA-SOP-OPS-12 to mandate dual tagging verification',
    });

    const dcr = useDCRStore.getState().addRecord({
      docNo: 'PTA-SOP-OPS-12',
      title: 'Positive Isolation and Spading Standard',
      requestor: 'Operations QA Lead',
      department: 'Operations',
      changeDescription: 'Incorporate mandatory dual-tagging checklist (Reference: NCR-2026-XFLOW)',
      reason: 'Prevent isolation failures identified in NCR-2026-XFLOW',
      status: 'Pending Review',
    });

    expect(dcr.id).toBeDefined();
    expect(dcr.changeDescription).toContain('NCR-2026-XFLOW');

    // Stage 3: DCR approval chain
    // Step 3a: Technical Review by MR
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Pending QA Approval',
      reviewedBy: 'T. Manobala (MR)',
      reviewDate: '2026-03-05',
    } as any);

    // Step 3b: GM Approval
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Approved',
      approvedBy: 'General Manager',
      approvalDate: '2026-03-06',
    } as any);

    const approvedDCR = useDCRStore.getState().records.find((r) => r.id === dcr.id);
    expect(approvedDCR?.status).toBe('Approved');

    // Stage 4: DML Document Revision Flow
    // Find active doc or create Rev 01
    const dmlDoc = useDMLStore.getState().addRecord({
      no: 'PTA-SOP-OPS-12',
      tt: 'Positive Isolation and Spading Standard',
      dept: 'Operations',
      rv: 'Rev 01',
      status: 'Published',
    });

    // Revise doc: mark Rev 01 Obsolete, publish Rev 02
    useDMLStore.getState().updateRecord(dmlDoc.id, { status: 'Obsolete', isArchived: true });
    const newRevDoc = useDMLStore.getState().addRecord({
      no: dmlDoc.no,
      tt: dmlDoc.tt,
      dept: dmlDoc.dept,
      rv: 'Rev 02',
      status: 'Published',
      nt: `Updated pursuant to approved ${dcr.dcrNo} closing ${ncr.ref}`,
    });

    expect(newRevDoc.rv).toBe('Rev 02');
    expect(newRevDoc.status).toBe('Published');

    // Stage 5: Close NCR
    useNCRStore.getState().updateRecord(ncr.id, {
      status: 'Closed',
      verifiedBy: 'T. Manobala',
      verifiedDate: '2026-03-07',
      approvedBy: 'T. Manobala (MR)',
      approvalDate: '2026-03-07',
      approvalComments: `Closed following publication of ${newRevDoc.no} ${newRevDoc.rv}`,
    });

    const finalNCR = useNCRStore.getState().records.find((r) => r.id === ncr.id);
    expect(finalNCR?.status).toBe('Closed');
    expect(finalNCR?.approvalComments).toContain('Rev 02');

    // Stage 6: Audit Trail Integrity Verification
    const auditEntries = useAuditStore.getState().entries;
    expect(auditEntries.length).toBeGreaterThanOrEqual(4);

    const ncrAudits = auditEntries.filter((e) => e.entityId === ncr.id);
    const dcrAudits = auditEntries.filter((e) => e.entityId === dcr.id);
    const dmlAudits = auditEntries.filter((e) => e.entityId === dmlDoc.id || e.entityId === newRevDoc.id);

    expect(ncrAudits.length).toBeGreaterThanOrEqual(1);
    expect(dcrAudits.length).toBeGreaterThanOrEqual(1);
    expect(dmlAudits.length).toBeGreaterThanOrEqual(1);
  });
});
