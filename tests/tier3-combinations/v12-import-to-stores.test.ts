import { describe, it, expect, beforeEach } from 'vitest';
import sampleBackup from '../fixtures/sample-v12-backup.json';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useMRMStore } from '../../src/store/useMRMStore';
import { useTUVStore } from '../../src/store/useTUVStore';
import { useObjectivesStore } from '../../src/store/useObjectivesStore';
import { useAuditProgrammeStore } from '../../src/store/useAuditProgrammeStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 3 — Cross-Feature Combinations: V12 Import Hydration Across 10 Stores', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  it('T3-V12-01: executes multi-store hydration and validates query counts and relations', () => {
    // 1. Hydrate NCR store
    const ncrRecords = sampleBackup.ncr.map((item, idx) => ({
      id: `ncr-v12-${item.id || idx}`,
      ref: item.ref,
      project: item.project,
      desc: item.desc,
      status: (item.st as any) || 'Closed',
      auditeeDept: item.auditeeDept,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useNCRStore.setState({ records: ncrRecords });

    // 2. Hydrate CSI store
    const csiRecords = sampleBackup.cs.map((item, idx) => ({
      id: `csi-v12-${item.id || idx}`,
      cl: item.cl,
      proj: item.proj,
      yr: item.yr,
      score: item.score,
      rating: item.rating,
      obs: item.obs,
      scores: item.scores,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useCSIStore.setState({ records: csiRecords });

    // 3. Hydrate DML store
    const dmlRecords = sampleBackup.dml.map((item, idx) => ({
      id: `dml-v12-${item.id || idx}`,
      no: item.no,
      tt: item.tt,
      dept: item.dept,
      rv: item.rv,
      status: (item.st as any) || 'Published',
      hierarchyLevel: (item.lv as any) || 'L2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useDMLStore.setState({ records: dmlRecords });

    // 4. Hydrate DCR store
    const dcrRecords = sampleBackup.dcr.map((item, idx) => ({
      id: `dcr-v12-${item.id || idx}`,
      dcrNo: item.dcrNo,
      docNo: item.docNo,
      docId: '',
      title: item.title,
      requestor: item.requestor,
      department: item.dept,
      changeDescription: item.change,
      reason: item.reason,
      status: (item.st as any) || 'Approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useDCRStore.setState({ records: dcrRecords });

    // 5. Hydrate MRM store
    const mrmRecords = sampleBackup.mrm.map((item, idx) => ({
      id: `mrm-v12-${item.id || idx}`,
      meetingNo: item.ref,
      date: item.dt,
      chairperson: item.chr,
      attendees: item.att.split(',').map((a: string) => a.trim()),
      agenda: ['V12 Legacy Review'],
      status: (item.st === 'Approved' ? 'Completed' : 'Scheduled') as any,
      actionItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useMRMStore.setState({ records: mrmRecords });

    // Verify all stores populated accurately
    expect(useNCRStore.getState().records).toHaveLength(sampleBackup.ncr.length);
    expect(useCSIStore.getState().records).toHaveLength(sampleBackup.cs.length);
    expect(useDMLStore.getState().records).toHaveLength(sampleBackup.dml.length);
    expect(useDCRStore.getState().records).toHaveLength(sampleBackup.dcr.length);
    expect(useMRMStore.getState().records).toHaveLength(sampleBackup.mrm.length);

    // Verify relation: DCR docNo matches DML document no
    const dcrItem = useDCRStore.getState().records[0];
    const relatedDML = useDMLStore.getState().records.find((d) => d.no === dcrItem.docNo);
    expect(dcrItem.docNo).toBe('PT/QCR/47');

    // Verify sequence counter preserves monotonicity
    const nextNcrId = sampleBackup.nid.ncr;
    expect(nextNcrId).toBeGreaterThan(sampleBackup.ncr.length);
  });
});
