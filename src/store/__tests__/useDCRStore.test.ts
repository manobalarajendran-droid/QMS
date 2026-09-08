import { useDCRStore } from '../useDCRStore';
import { useDMLStore } from '../useDMLStore';
import type { DCRRecord } from '../../types';

const initialDCRState = useDCRStore.getState();
const initialDMLState = useDMLStore.getState();

function makeRecord(overrides: Partial<DCRRecord> = {}): Omit<DCRRecord, 'id' | 'dcrNo' | 'createdAt' | 'updatedAt'> {
  return {
    docId: '',
    docNo: 'PTA-QM-P-01',
    title: 'Test Procedure',
    requestor: 'Tester',
    department: 'QA',
    changeDescription: 'Test change',
    reason: 'Test reason',
    status: 'Draft',
    ...overrides,
  };
}

beforeEach(() => {
  useDCRStore.setState({ ...initialDCRState, records: [] });
  useDMLStore.setState({ ...initialDMLState, records: [] });
});

describe('useDCRStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/dcrNo/timestamps and no stateHistory', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.dcrNo).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Draft');
      expect(record.stateHistory ?? []).toHaveLength(0);
      expect(useDCRStore.getState().records).toHaveLength(1);
    });
  });

  describe('forward path', () => {
    it('walks Draft -> Pending Review via transitionStatus, recording history', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Pending Review', 'Alice', 'submitted for review', 'forward');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Pending Review');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Draft',
        to: 'Pending Review',
        by: 'Alice',
        reason: 'submitted for review',
        kind: 'forward',
      });
    });

    it('walks Pending Review -> Pending QA Approval via reviewDCR, setting ApprovalMetadata', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Pending Review' }));

      store.reviewDCR(record.id, 'Bob', 'looks good');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Pending QA Approval');
      expect(updated.reviewedBy).toBe('Bob');
      expect(updated.reviewComments).toBe('looks good');
      expect(updated.reviewDate).toBeTruthy();
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Pending Review',
        to: 'Pending QA Approval',
        by: 'Bob',
        kind: 'forward',
      });
    });

    it('walks Pending QA Approval -> Approved via approveDCR, setting ApprovalMetadata', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Pending QA Approval', revNo: 'Rev 02' }));

      store.approveDCR(record.id, 'Carol', 'approved for release');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Approved');
      expect(updated.approvedBy).toBe('Carol');
      expect(updated.approvalComments).toBe('approved for release');
      expect(updated.approvalDate).toBeTruthy();
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Pending QA Approval',
        to: 'Approved',
        by: 'Carol',
        kind: 'verify',
      });
    });
  });

  describe('reject path', () => {
    it('returns to the previous status via generic transitionStatus reject', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Pending Review' }));

      store.transitionStatus(record.id, 'Draft', 'Alice', 'needs more detail', 'reject');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Draft');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Pending Review',
        to: 'Draft',
        kind: 'reject',
      });
    });

    it('hard-rejects to Rejected via rejectDCR, setting rejection metadata', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Pending QA Approval' }));

      store.rejectDCR(record.id, 'Carol', 'does not meet standard');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Rejected');
      expect(updated.rejectedBy).toBe('Carol');
      expect(updated.rejectionReason).toBe('does not meet standard');
      expect(updated.rejectionDate).toBeTruthy();
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Pending QA Approval',
        to: 'Rejected',
        kind: 'reject',
      });
    });
  });

  describe('reopen path', () => {
    it('reopens from Approved to Draft via transitionStatus', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Approved' }));

      store.transitionStatus(record.id, 'Draft', 'Admin', 'revision required', 'reopen');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Draft');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Approved',
        to: 'Draft',
        kind: 'reopen',
      });
    });

    it('reopens from Rejected to Draft via transitionStatus', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Rejected' }));

      store.transitionStatus(record.id, 'Draft', 'Admin', 'reconsidering', 'reopen');

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Draft');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Rejected',
        to: 'Draft',
        kind: 'reopen',
      });
    });
  });

  describe('DCR -> DML sync on approveDCR', () => {
    it('updates the matching DML record rv/reviewDate/status when docNo matches', () => {
      const dcr = useDCRStore.getState().addRecord(
        makeRecord({ status: 'Pending QA Approval', docNo: 'PTA-QM-P-01', revNo: 'Rev 03' })
      );

      const dmlRecord = useDMLStore.getState().addRecord({
        no: 'PTA-QM-P-01',
        tt: 'Test Procedure',
        rv: 'Rev 02',
        status: 'Under Review',
      });

      useDCRStore.getState().approveDCR(dcr.id, 'Carol', 'approved');

      const updatedDml = useDMLStore.getState().records.find((d) => d.id === dmlRecord.id)!;
      expect(updatedDml.rv).toBe('Rev 03');
      expect(updatedDml.status).toBe('Active');
      expect(updatedDml.reviewDate).toBeTruthy();
    });

    it('does nothing to DML when no matching docNo exists', () => {
      const dcr = useDCRStore.getState().addRecord(
        makeRecord({ status: 'Pending QA Approval', docNo: 'PTA-NONEXISTENT', revNo: 'Rev 03' })
      );

      useDMLStore.getState().addRecord({ no: 'PTA-OTHER-DOC', rv: 'Rev 01', status: 'Active' });

      useDCRStore.getState().approveDCR(dcr.id, 'Carol', 'approved');

      const unrelated = useDMLStore.getState().records.find((d) => d.no === 'PTA-OTHER-DOC')!;
      expect(unrelated.rv).toBe('Rev 01');
      expect(unrelated.status).toBe('Active');
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { title: 'Updated Title' });

      const updated = useDCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.title).toBe('Updated Title');
      expect(updated.docNo).toBe(record.docNo);
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useDCRStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useDCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useDCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useDCRStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useDCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useDCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
