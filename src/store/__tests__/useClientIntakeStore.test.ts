import { useClientIntakeStore } from '../useClientIntakeStore';
import type { ClientIntakeRecord } from '../../types';

const initialState = useClientIntakeStore.getState();

function makeRecord(overrides: Partial<ClientIntakeRecord> = {}): Omit<ClientIntakeRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    intakeType: 'Complaint',
    receivedBy: 'Test Receiver',
    routedToDept: 'Operations',
    timeLogged: '2026-03-06T08:00:00.000Z',
    description: 'Test description',
    title: 'Test Intake',
    status: 'Logged',
    ...overrides,
  };
}

beforeEach(() => {
  useClientIntakeStore.setState({ ...initialState, records: [] });
});

describe('useClientIntakeStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.id.startsWith('voc-')).toBe(true);
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Logged');
      expect(record.stateHistory ?? []).toHaveLength(0);
    });

    it('accepts free-text routedToDept values not in the canonical department list', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord({ routedToDept: 'Field' }));

      expect(record.routedToDept).toBe('Field');
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { assignedTo: 'Jane Doe', dueDate: '2026-03-10' });

      const updated = useClientIntakeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.assignedTo).toBe('Jane Doe');
      expect(updated.dueDate).toBe('2026-03-10');
      expect(updated.title).toBe(record.title);
    });
  });

  describe('updateStatus', () => {
    it('sets status without a stateHistory entry (legacy quick-action path)', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateStatus(record.id, 'Acknowledged');

      const updated = useClientIntakeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Acknowledged');
    });
  });

  describe('transitionStatus', () => {
    it('records a forward stateHistory entry', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Acknowledged' }));

      store.transitionStatus(record.id, 'Closed', 'QA Manager', 'verified resolved', 'verify');

      const updated = useClientIntakeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Closed');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Acknowledged',
        to: 'Closed',
        by: 'QA Manager',
        reason: 'verified resolved',
        kind: 'verify',
      });
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Acknowledged', 'Alice', 'first', 'forward');
      store.transitionStatus(record.id, 'Closed', 'Bob', 'second', 'verify');

      const updated = useClientIntakeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });

    it('supports reopening a Closed record', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Closed' }));

      store.transitionStatus(record.id, 'Acknowledged', 'Admin', 'reopened in error', 'reopen');

      const updated = useClientIntakeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Acknowledged');
      expect(updated.stateHistory![0].kind).toBe('reopen');
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useClientIntakeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useClientIntakeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useClientIntakeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useClientIntakeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useClientIntakeStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useClientIntakeStore.getState().records).toHaveLength(0);
    });
  });
});
