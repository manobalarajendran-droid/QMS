import { useNCRStore } from '../useNCRStore';
import type { NCRRecord } from '../../types';

const initialState = useNCRStore.getState();

function makeRecord(overrides: Partial<NCRRecord> = {}): Omit<NCRRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ref: 'TEST-001',
    project: 'Test Project',
    raisedBy: 'Tester',
    auditeeDept: 'IT',
    classification: 'NCR',
    desc: 'Test description',
    objEvidence: 'Test evidence',
    status: 'Open',
    ...overrides,
  };
}

beforeEach(() => {
  useNCRStore.setState({ ...initialState, records: [] });
});

describe('useNCRStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Open');
      expect(useNCRStore.getState().records).toHaveLength(1);
    });
  });

  describe('transitionStatus — forward path', () => {
    it('walks Open -> Investigation -> RootCause -> CAPA_Planned -> CAPA_InProgress -> Verification, recording history each step', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      const forwardPath: Array<[typeof record.status, typeof record.status]> = [
        ['Open', 'Investigation'],
        ['Investigation', 'RootCause'],
        ['RootCause', 'CAPA_Planned'],
        ['CAPA_Planned', 'CAPA_InProgress'],
        ['CAPA_InProgress', 'Verification'],
      ];

      for (const [, to] of forwardPath) {
        useNCRStore.getState().transitionStatus(record.id, to, 'QA Manager', `Moving to ${to}`, 'forward');
      }

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Verification');
      expect(updated.stateHistory).toHaveLength(5);
      expect(updated.stateHistory![0]).toMatchObject({ from: 'Open', to: 'Investigation', kind: 'forward', by: 'QA Manager', reason: 'Moving to Investigation' });
      expect(updated.stateHistory![4]).toMatchObject({ from: 'CAPA_InProgress', to: 'Verification', kind: 'forward' });
      updated.stateHistory!.forEach((h) => expect(h.at).toBeTruthy());
    });
  });

  describe('transitionStatus — reject / return to previous', () => {
    it('sends Root Cause back to Investigation with a reason recorded in state history', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      useNCRStore.getState().transitionStatus(record.id, 'Investigation', 'QA Manager', 'Start investigation', 'forward');
      useNCRStore.getState().transitionStatus(record.id, 'RootCause', 'QA Manager', 'RCA stage', 'forward');

      useNCRStore.getState().transitionStatus(record.id, 'Investigation', 'QA Manager', 'RCA incomplete, needs more investigation', 'reject');

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Investigation');
      expect(updated.stateHistory).toHaveLength(3);
      expect(updated.stateHistory![2]).toMatchObject({
        from: 'RootCause',
        to: 'Investigation',
        kind: 'reject',
        reason: 'RCA incomplete, needs more investigation',
      });
    });

    it('does not make a rejected NCR disappear from the visible Kanban statuses (regression for the old CAPA_InProgress bug)', () => {
      const VISIBLE_STATUSES = ['Open', 'Investigation', 'RootCause', 'CAPA_Planned', 'CAPA_InProgress', 'Verification', 'Closed'];
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      useNCRStore.getState().transitionStatus(record.id, 'Investigation', 'QA Manager', 'go', 'forward');
      useNCRStore.getState().transitionStatus(record.id, 'RootCause', 'QA Manager', 'go', 'forward');
      useNCRStore.getState().transitionStatus(record.id, 'CAPA_Planned', 'QA Manager', 'go', 'forward');
      useNCRStore.getState().transitionStatus(record.id, 'CAPA_InProgress', 'QA Manager', 'go', 'forward');
      useNCRStore.getState().transitionStatus(record.id, 'Verification', 'QA Manager', 'go', 'forward');

      useNCRStore.getState().rejectNCR(record.id, 'QA Manager', 'Not verified, returning to CAPA');

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(VISIBLE_STATUSES).toContain(updated.status);
      expect(updated.status).toBe('CAPA_InProgress');
    });
  });

  describe('approveNCR', () => {
    it('closes the record, sets ApprovalMetadata, and records a verify history entry', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Verification' }));

      useNCRStore.getState().approveNCR(record.id, 'MR Admin', 'All good, closing');

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Closed');
      expect(updated.approvedBy).toBe('MR Admin');
      expect(updated.approvalComments).toBe('All good, closing');
      expect(updated.finalDecision).toBe('Accepted & Closed');
      expect(updated.verifiedBy).toBe('MR Admin');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({ from: 'Verification', to: 'Closed', kind: 'verify', by: 'MR Admin' });
    });
  });

  describe('rejectNCR', () => {
    it('returns a Verification-stage record to CAPA_InProgress with rejection metadata', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Verification' }));

      useNCRStore.getState().rejectNCR(record.id, 'MR Admin', 'Evidence insufficient');

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('CAPA_InProgress');
      expect(updated.rejectedBy).toBe('MR Admin');
      expect(updated.rejectionReason).toBe('Evidence insufficient');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({ from: 'Verification', to: 'CAPA_InProgress', kind: 'reject' });
    });
  });

  describe('transitionStatus — reopen', () => {
    it('reopens a Closed record back to CAPA_InProgress with a reason in state history', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Verification' }));

      useNCRStore.getState().approveNCR(record.id, 'MR Admin', 'Closing');
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)!.status).toBe('Closed');

      useNCRStore.getState().transitionStatus(record.id, 'CAPA_InProgress', 'MR Admin', 'New evidence surfaced, reopening', 'reopen');

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('CAPA_InProgress');
      expect(updated.stateHistory).toHaveLength(2);
      expect(updated.stateHistory![1]).toMatchObject({
        from: 'Closed',
        to: 'CAPA_InProgress',
        kind: 'reopen',
        reason: 'New evidence surfaced, reopening',
      });
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields including new ownership/action-plan fields without touching others', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      useNCRStore.getState().updateRecord(record.id, {
        assignedTo: 'Jane Doe',
        assignedDept: 'IT',
        slaDeadline: '2026-12-01',
        containmentAction: 'Isolate the defect',
        containmentBy: 'Jane Doe',
        containmentTargetDate: '2026-10-01',
      });

      const updated = useNCRStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.assignedTo).toBe('Jane Doe');
      expect(updated.assignedDept).toBe('IT');
      expect(updated.slaDeadline).toBe('2026-12-01');
      expect(updated.containmentAction).toBe('Isolate the defect');
      expect(updated.desc).toBe('Test description');
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());
      useNCRStore.getState().deleteRecord(record.id);
      expect(useNCRStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive/unarchive/toggleArchive', () => {
    it('toggles isArchived', () => {
      const store = useNCRStore.getState();
      const record = store.addRecord(makeRecord());

      useNCRStore.getState().toggleArchive(record.id);
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      useNCRStore.getState().toggleArchive(record.id);
      expect(useNCRStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
