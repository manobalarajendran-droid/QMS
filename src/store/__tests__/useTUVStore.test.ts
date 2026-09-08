import { useTUVStore } from '../useTUVStore';
import type { TUVRecord } from '../../types';

const initialState = useTUVStore.getState();

function makeRecord(overrides: Partial<TUVRecord> = {}): Omit<TUVRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    num: 'R99',
    cl: '9.9',
    desc: 'Test TÜV finding',
    owner: 'Test Owner',
    assignedDept: 'IED / QAQC',
    due: '2026-12-31',
    status: 'Open',
    ...overrides,
  };
}

beforeEach(() => {
  useTUVStore.setState({ ...initialState, records: [] });
});

describe('useTUVStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps, default status and isArchived', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.id.startsWith('tuv-')).toBe(true);
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Open');
      expect(record.isArchived).toBe(false);
      expect(record.stateHistory ?? []).toHaveLength(0);
    });

    it('defaults status to Open when none is provided', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: undefined as unknown as TUVRecord['status'] }));

      expect(record.status).toBe('Open');
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { evidence: 'PT/QM/01 revised', assignedDept: 'Projects' });

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.evidence).toBe('PT/QM/01 revised');
      expect(updated.assignedDept).toBe('Projects');
      expect(updated.desc).toBe(record.desc);
    });
  });

  describe('updateStatus', () => {
    it('sets status and stamps closed date for Closed without a stateHistory entry (legacy quick-action path)', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress' }));

      store.updateStatus(record.id, 'Closed', 'closing out');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Closed');
      expect(updated.closed).toBeTruthy();
      expect(updated.stateHistory ?? []).toHaveLength(0);
    });
  });

  describe('transitionStatus', () => {
    it('records a forward stateHistory entry (Open -> Action Taken)', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Open' }));

      store.transitionStatus(record.id, 'Action Taken', 'Dept Head', 'action taken', 'forward');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Action Taken');
      expect(updated.actionTakenDate).toBeTruthy();
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Open',
        to: 'Action Taken',
        by: 'Dept Head',
        reason: 'action taken',
        kind: 'forward',
      });
    });

    it('populates approvedBy/approvalDate/approvalComments AND verifiedBy/verifiedDate on verify', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Action Taken' }));

      store.transitionStatus(record.id, 'Verified', 'QA Manager', 'evidence confirmed', 'verify');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Verified');
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalComments).toBe('evidence confirmed');
      expect(updated.approvalDate).toBeTruthy();
      expect(updated.verifiedBy).toBe('QA Manager');
      expect(updated.verifiedDate).toBeTruthy();
    });

    it('stamps closed date on forward transition to Closed', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Verified' }));

      store.transitionStatus(record.id, 'Closed', 'QA Manager', 'closing after verification', 'forward');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Closed');
      expect(updated.closed).toBeTruthy();
    });

    it('populates reviewedBy/reviewDate/reviewComments on reject', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Action Taken' }));

      store.transitionStatus(record.id, 'Open', 'Admin', 'sent back for rework', 'reject');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Open');
      expect(updated.reviewedBy).toBe('Admin');
      expect(updated.reviewComments).toBe('sent back for rework');
    });

    it('leaves ApprovalMetadata and verifiedBy/verifiedDate untouched on reopen', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Action Taken' }));

      store.transitionStatus(record.id, 'Verified', 'QA Manager', 'verified', 'verify');
      store.transitionStatus(record.id, 'Action Taken', 'Admin', 'reopened for rework', 'reopen');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Action Taken');
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalComments).toBe('verified');
      expect(updated.verifiedBy).toBe('QA Manager');
      expect(updated.stateHistory).toHaveLength(2);
      expect(updated.stateHistory![1].kind).toBe('reopen');
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Action Taken', 'Alice', 'first', 'forward');
      store.transitionStatus(record.id, 'Verified', 'Bob', 'second', 'verify');

      const updated = useTUVStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useTUVStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useTUVStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useTUVStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useTUVStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useTUVStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useTUVStore.getState().records).toHaveLength(0);
    });
  });
});
