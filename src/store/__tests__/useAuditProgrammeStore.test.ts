import { useAuditProgrammeStore } from '../useAuditProgrammeStore';
import type { AuditProgrammeRecord } from '../../types';

const initialState = useAuditProgrammeStore.getState();

function makeRecord(overrides: Partial<AuditProgrammeRecord> = {}): Omit<AuditProgrammeRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ref: 'IA-TEST-01',
    sc: 'Test Scope',
    aud: 'Tester',
    dep: 'QA',
    dt: '2026-01-01',
    nc: 0,
    obs: 0,
    fnd: '',
    status: 'Planned',
    ...overrides,
  };
}

beforeEach(() => {
  useAuditProgrammeStore.setState({ ...initialState, records: [] });
});

describe('useAuditProgrammeStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Planned');
      expect(record.stateHistory ?? []).toHaveLength(0);
      expect(useAuditProgrammeStore.getState().records).toHaveLength(1);
    });
  });

  describe('forward path via transitionStatus', () => {
    it('walks Planned -> In Progress, recording history', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'In Progress', 'Alice', 'audit started', 'forward');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('In Progress');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Planned',
        to: 'In Progress',
        by: 'Alice',
        reason: 'audit started',
        kind: 'forward',
      });
    });

    it('walks In Progress -> Completed, auto-setting completedDate', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress' }));

      store.transitionStatus(record.id, 'Completed', 'Bob', 'report issued', 'verify');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Completed');
      expect(updated.completedDate).toBeTruthy();
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'In Progress',
        to: 'Completed',
        kind: 'verify',
      });
    });

    it('walks Completed -> Follow-up, auto-setting followUpDate', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Completed' }));

      store.transitionStatus(record.id, 'Follow-up', 'Carol', 'verified effective', 'verify');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Follow-up');
      expect(updated.followUpDate).toBeTruthy();
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Completed',
        to: 'Follow-up',
        kind: 'verify',
      });
    });
  });

  describe('reject path', () => {
    it('returns to the previous status via transitionStatus reject', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'In Progress' }));

      store.transitionStatus(record.id, 'Planned', 'Alice', 'not ready to start', 'reject');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Planned');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'In Progress',
        to: 'Planned',
        kind: 'reject',
      });
    });
  });

  describe('reopen path', () => {
    it('reopens from terminal Follow-up back to In Progress', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Follow-up' }));

      store.transitionStatus(record.id, 'In Progress', 'Admin', 'findings not actually closed', 'reopen');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('In Progress');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Follow-up',
        to: 'In Progress',
        kind: 'reopen',
      });
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { sc: 'Updated Scope' });

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.sc).toBe('Updated Scope');
      expect(updated.ref).toBe(record.ref);
    });

    it('still accepts legacy status values directly (e.g. Report Issued)', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { status: 'Report Issued' });

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Report Issued');
    });
  });

  describe('updateStatus', () => {
    it('sets status directly and auto-completes on Report Issued', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateStatus(record.id, 'Report Issued', 'legacy path');

      const updated = useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Report Issued');
      expect(updated.completedDate).toBeTruthy();
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useAuditProgrammeStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useAuditProgrammeStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useAuditProgrammeStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
