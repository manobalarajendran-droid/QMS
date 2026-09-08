import { useDMLStore } from '../useDMLStore';
import type { DMLRecord } from '../../types';

const initialState = useDMLStore.getState();

function makeRecord(overrides: Partial<DMLRecord> = {}): Omit<DMLRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    no: 'PTA-TEST-01',
    tt: 'Test Document',
    hierarchyLevel: 'L3',
    dept: 'QA',
    rv: 'Rev 00',
    status: 'Draft',
    ...overrides,
  };
}

beforeEach(() => {
  useDMLStore.setState({ ...initialState, records: [] });
});

describe('useDMLStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Draft');
      expect(record.stateHistory ?? []).toHaveLength(0);
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { assignedTo: 'Jane Doe', dueDate: '2026-12-01' });

      const updated = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.assignedTo).toBe('Jane Doe');
      expect(updated.dueDate).toBe('2026-12-01');
      expect(updated.no).toBe(record.no);
    });
  });

  describe('transitionStatus', () => {
    it('walks Draft -> UnderReview, recording a forward stateHistory entry', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'UnderReview', 'Alice', 'submitted for review', 'forward');

      const updated = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('UnderReview');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Draft',
        to: 'UnderReview',
        by: 'Alice',
        reason: 'submitted for review',
        kind: 'forward',
      });
    });

    it('rejects from Approved back to UnderReview', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Approved' }));

      store.transitionStatus(record.id, 'UnderReview', 'Bob', 'needs more detail', 'reject');

      const updated = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('UnderReview');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Approved',
        to: 'UnderReview',
        kind: 'reject',
      });
    });

    it('reopens from Obsolete back to Published', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Obsolete' }));

      store.transitionStatus(record.id, 'Published', 'Admin', 'reinstated in error', 'reopen');

      const updated = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Published');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Obsolete',
        to: 'Published',
        kind: 'reopen',
      });
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'UnderReview', 'QA', 'first', 'forward');
      store.transitionStatus(record.id, 'Approved', 'QA', 'second', 'forward');

      const updated = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });
  });

  describe('reviseDocument', () => {
    it('obsoletes the existing record with a stateHistory entry and isArchived:true', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Published', rv: 'Rev 01' }));

      store.reviseDocument(record.id, { nt: 'Updated procedure steps' }, 'Alice');

      const superseded = useDMLStore.getState().records.find((r) => r.id === record.id)!;
      expect(superseded.status).toBe('Obsolete');
      expect(superseded.isArchived).toBe(true);
      expect(superseded.stateHistory).toHaveLength(1);
      expect(superseded.stateHistory![0]).toMatchObject({
        from: 'Published',
        to: 'Obsolete',
        by: 'Alice',
        kind: 'forward',
      });
    });

    it('creates a new revision starting at Draft with empty stateHistory', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Published', rv: 'Rev 01' }));

      const newRecord = store.reviseDocument(record.id, { nt: 'Updated procedure steps' }, 'Alice');

      expect(newRecord).not.toBeNull();
      expect(newRecord!.id).not.toBe(record.id);
      expect(newRecord!.status).toBe('Draft');
      expect(newRecord!.stateHistory ?? []).toHaveLength(0);
      expect(newRecord!.rv).not.toBe('Rev 01');
      expect(useDMLStore.getState().records).toHaveLength(2);
    });

    it('does not set an orphan approvalDate when no approvedBy is passed', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Published' }));

      const newRecord = store.reviseDocument(record.id, {}, 'Alice');

      expect(newRecord!.approvedBy).toBeUndefined();
      expect(newRecord!.approvalDate).toBeUndefined();
    });

    it('sets approvalDate only when approvedBy is passed', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Published' }));

      const newRecord = store.reviseDocument(record.id, {}, 'Alice', 'Carol');

      expect(newRecord!.approvedBy).toBe('Carol');
      expect(newRecord!.approvalDate).toBeTruthy();
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useDMLStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useDMLStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useDMLStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useDMLStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useDMLStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useDMLStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
