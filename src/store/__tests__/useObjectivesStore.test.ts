import { useObjectivesStore } from '../useObjectivesStore';
import type { ObjectiveRecord } from '../../types';

const initialState = useObjectivesStore.getState();

function makeRecord(overrides: Partial<ObjectiveRecord> = {}): Omit<ObjectiveRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    yr: '2026',
    dept: 'IED / QAQC',
    desc: 'Test objective description',
    owner: 'Test Owner',
    deadline: '31-Dec-2026',
    status: 'Not Started',
    pct: 0,
    ...overrides,
  };
}

beforeEach(() => {
  useObjectivesStore.setState({ ...initialState, records: [] });
});

describe('useObjectivesStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps, default status and isArchived', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.id.startsWith('obj-')).toBe(true);
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Not Started');
      expect(record.isArchived).toBe(false);
      expect(record.stateHistory ?? []).toHaveLength(0);
    });

    it('defaults status to Not Started when none is provided', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: undefined as unknown as ObjectiveRecord['status'] }));

      expect(record.status).toBe('Not Started');
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { correctiveAction: 'Escalate to dept heads', correctiveOwner: 'MR' });

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.correctiveAction).toBe('Escalate to dept heads');
      expect(updated.correctiveOwner).toBe('MR');
      expect(updated.desc).toBe(record.desc);
    });
  });

  describe('updateStatus', () => {
    it('sets status and pct to 100 for Completed without a stateHistory entry (legacy quick-action path)', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress', pct: 40 }));

      store.updateStatus(record.id, 'Completed', 'closing out');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Completed');
      expect(updated.pct).toBe(100);
      expect(updated.remarks).toBe('closing out');
      expect(updated.stateHistory ?? []).toHaveLength(0);
    });
  });

  describe('transitionStatus', () => {
    it('records a forward stateHistory entry', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Not Started' }));

      store.transitionStatus(record.id, 'In Progress', 'Dept Head', 'kicking off', 'forward');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('In Progress');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Not Started',
        to: 'In Progress',
        by: 'Dept Head',
        reason: 'kicking off',
        kind: 'forward',
      });
    });

    it('sets pct to 100 and populates approvedBy/approvalDate/approvalComments on verify to Achieved', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress', pct: 50 }));

      store.transitionStatus(record.id, 'Achieved', 'QA Manager', 'evidence confirmed', 'verify');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Achieved');
      expect(updated.pct).toBe(100);
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalComments).toBe('evidence confirmed');
      expect(updated.approvalDate).toBeTruthy();
    });

    it('populates rejectedBy/rejectionDate/rejectionReason on verify to Not Achieved', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress' }));

      store.transitionStatus(record.id, 'Not Achieved', 'QA Manager', 'target missed', 'verify');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Not Achieved');
      expect(updated.rejectedBy).toBe('QA Manager');
      expect(updated.rejectionReason).toBe('target missed');
    });

    it('populates reviewedBy/reviewDate/reviewComments on reject', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress' }));

      store.transitionStatus(record.id, 'Not Started', 'Admin', 'sent back for rework', 'reject');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Not Started');
      expect(updated.reviewedBy).toBe('Admin');
      expect(updated.reviewComments).toBe('sent back for rework');
    });

    it('leaves ApprovalMetadata untouched on reopen', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress', pct: 60 }));

      store.transitionStatus(record.id, 'Achieved', 'QA Manager', 'verified', 'verify');
      store.transitionStatus(record.id, 'In Progress', 'Admin', 'reopened for rework', 'reopen');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('In Progress');
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalComments).toBe('verified');
      expect(updated.stateHistory).toHaveLength(2);
      expect(updated.stateHistory![1].kind).toBe('reopen');
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'In Progress', 'Alice', 'first', 'forward');
      store.transitionStatus(record.id, 'Achieved', 'Bob', 'second', 'verify');

      const updated = useObjectivesStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useObjectivesStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useObjectivesStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useObjectivesStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useObjectivesStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useObjectivesStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useObjectivesStore.getState().records).toHaveLength(0);
    });
  });
});
