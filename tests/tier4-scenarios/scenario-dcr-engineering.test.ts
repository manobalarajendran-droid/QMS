import { describe, it, expect, beforeEach } from 'vitest';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 4 — Real-World Scenario 3: Engineering Document Change Notice (DCR to DML)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
    useDCRStore.setState({ records: [] });
    useDMLStore.setState({ records: [] });
  });

  it('T4-SCEN-03: executes multi-tier engineering procedure overhaul from request to DML publication', () => {
    // 1. Existing baseline document in DML
    const originalDoc = useDMLStore.getState().addRecord({
      no: 'PTA-PR-HSE-04',
      tt: 'Confined Space Entry & Inert Gas Purging',
      dept: 'HSE',
      hierarchyLevel: 'L2',
      rv: 'Rev 01',
      status: 'Published',
      ret: '05 Yrs',
    });

    expect(originalDoc.status).toBe('Published');

    // 2. Field safety engineer identifies regulatory update (Saudi Civil Defense & OSHA)
    const dcr = useDCRStore.getState().addRecord({
      docNo: originalDoc.no!,
      title: originalDoc.tt!,
      requestor: 'Senior Safety Specialist Tariq',
      department: 'HSE',
      changeDescription: 'Mandate continuous multi-gas monitor with active cloud data logging inside vessels > 10m height',
      reason: 'Updated industrial safety standard SASO/OSHA 2026',
      status: 'Draft',
    });

    expect(dcr.dcrNo).toMatch(/^DCR-\d{4}-\d{3}$/);

    // 3. Technical Review by Quality Management Representative (MR)
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Pending Review',
    });
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Pending QA Approval',
      reviewedBy: 'T. Manobala (MR)',
      reviewDate: '2026-03-08',
    } as any);

    let currentDCR = useDCRStore.getState().records.find((r) => r.id === dcr.id) as any;
    expect(currentDCR.reviewedBy).toBe('T. Manobala (MR)');

    // 4. Executive Approval by General Manager
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Approved',
      approvedBy: 'Managing Director / GM',
      approvalDate: '2026-03-09',
    } as any);

    currentDCR = useDCRStore.getState().records.find((r) => r.id === dcr.id) as any;
    expect(currentDCR.status).toBe('Approved');
    expect(currentDCR.approvedBy).toContain('Managing Director');

    // 5. Document Controller implements change in DML:
    // Mark Rev 01 Obsolete / Archived
    useDMLStore.getState().updateRecord(originalDoc.id, {
      status: 'Obsolete',
      isArchived: true,
    });

    // Publish Rev 02
    const revisedDoc = useDMLStore.getState().addRecord({
      no: originalDoc.no,
      tt: originalDoc.tt,
      dept: originalDoc.dept,
      hierarchyLevel: originalDoc.hierarchyLevel,
      rv: 'Rev 02',
      status: 'Published',
      reviewDate: '2027-03-09',
      nt: `Rev 02 approved under ${dcr.dcrNo}. Includes cloud telemetry multi-gas monitoring.`,
    });

    expect(revisedDoc.rv).toBe('Rev 02');
    expect(revisedDoc.status).toBe('Published');

    // 6. Update DCR status to Implemented
    useDCRStore.getState().updateRecord(dcr.id, {
      status: 'Implemented',
    });

    expect(useDCRStore.getState().records.find((r) => r.id === dcr.id)?.status).toBe('Implemented');

    // 7. Verify both records in DML (one obsolete, one published)
    const allHSEDocs = useDMLStore.getState().records.filter((d) => d.no === 'PTA-PR-HSE-04');
    expect(allHSEDocs).toHaveLength(2);
    expect(allHSEDocs.find((d) => d.rv === 'Rev 01')?.status).toBe('Obsolete');
    expect(allHSEDocs.find((d) => d.rv === 'Rev 02')?.status).toBe('Published');
  });
});
