import { describe, it, expect, beforeEach } from 'vitest';
import { useAuditProgrammeStore } from '../../src/store/useAuditProgrammeStore';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 4 — Real-World Scenario 1: ISO 9001:2015 Annual Surveillance Audit Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
    useNCRStore.setState({ records: [] });
    useAuditProgrammeStore.setState({ records: [] });
  });

  it('T4-SCEN-01: executes full annual audit cycle from scheduling to closeout approval', () => {
    // 1. Quality Manager schedules Annual Internal Audit IA-2026-ANNUAL
    const audit = useAuditProgrammeStore.getState().addRecord({
      ref: 'IA-2026-ANNUAL',
      sc: 'Clause 8.5 Production & Service Provision, Clause 7.1.5 Monitoring Equipment',
      aud: 'Lead Quality Auditor T. Manobala',
      dep: 'Field Operations & Warehouse',
      dt: '2026-03-15',
      status: 'Planned',
    });

    expect(audit.status).toBe('Planned');

    // 2. Audit commences -> transition to In Progress
    useAuditProgrammeStore.getState().updateRecord(audit.id, {
      status: 'In Progress' as any,
    });
    expect(useAuditProgrammeStore.getState().records.find((r) => r.id === audit.id)?.status).toBe('In Progress');

    // 3. Auditor discovers non-conformance: torque wrench missing calibration certificate
    const ncr = useNCRStore.getState().addRecord({
      ref: 'NCR-2026-AUD-01',
      dt: '2026-03-15',
      project: 'Main Warehouse Audit',
      raisedBy: 'T. Manobala',
      auditeeDept: 'Warehouse',
      classification: 'NCR',
      desc: 'Torque wrench TW-104 on active tool board had expired calibration tag (expired 15 days ago).',
      objEvidence: 'Physical inspection of tool tag during IA-2026-ANNUAL',
      status: 'Open',
    });

    // Link NCR to Audit
    useAuditProgrammeStore.getState().updateRecord(audit.id, {
      nc: 1,
      obs: 1,
      fnd: '1 Major NC raised regarding tool calibration control (NCR-2026-AUD-01). 1 Observation on shelf labelling.',
      ncrIds: [ncr.id],
    });

    // 4. Auditee conducts 5-Why Root Cause Analysis and submits CAPA
    useNCRStore.getState().updateRecord(ncr.id, {
      status: 'Investigation',
      rcaCat: 'Tool Management System',
      rca: '1. Why was tool on active board? Storekeeper placed it back after cleaning. 2. Why without check? No physical segregation for expired tools. 3. Root cause: Lack of quarantine red box for out-of-calibration tools.',
      corrAction: 'Immediately quarantined TW-104 and sent to calibration lab.',
      prevAction: 'Created designated red quarantine rack in warehouse with daily audit checklist.',
    });

    // 5. Verification stage by QA
    useNCRStore.getState().updateRecord(ncr.id, {
      status: 'Verification',
      verifiedBy: 'QA Inspector Tariq',
      verifiedDate: '2026-03-25',
    });

    // 6. Final Management Representative Closure Approval
    const approvalDate = '2026-03-26';
    useNCRStore.getState().updateRecord(ncr.id, {
      status: 'Closed',
      approvedBy: 'T. Manobala (MR)',
      approvalDate,
      approvalComments: 'Verified physical red quarantine rack installed. TW-104 returned with valid calibration certificate #CAL-9941.',
    });

    const finalNCR = useNCRStore.getState().records.find((r) => r.id === ncr.id);
    expect(finalNCR?.status).toBe('Closed');
    expect(finalNCR?.approvedBy).toContain('Manobala');

    // 7. Audit Report Issued and Closed
    useAuditProgrammeStore.getState().updateRecord(audit.id, {
      status: 'Report Issued',
      rpt: 'IA-2026-ANNUAL-FINAL-REPORT.pdf',
    });

    const finalAudit = useAuditProgrammeStore.getState().records.find((r) => r.id === audit.id);
    expect(finalAudit?.status).toBe('Report Issued');
    expect(finalAudit?.nc).toBe(1);

    // 8. Verify comprehensive audit trail
    const auditLogs = useAuditStore.getState().entries;
    expect(auditLogs.length).toBeGreaterThanOrEqual(3);
  });
});
