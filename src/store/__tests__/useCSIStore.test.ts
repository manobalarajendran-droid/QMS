import { useCSIStore } from '../useCSIStore';
import type { CSIRecord } from '../../types';

const initialState = useCSIStore.getState();

function makeRecord(overrides: Partial<CSIRecord> = {}): Omit<CSIRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    cl: 'Test Client',
    proj: 'Test Project',
    yr: '2026',
    ...overrides,
  };
}

// A full 22-answer map yielding a below-Satisfactory (<80) score, to exercise auto-spawn.
const LOW_SCORES: Record<string, number> = {
  '1A': 3, '1B': 3, '2A': 3, '2B': 3, '3A': 3, '3B': 3, '4A': 3, '4B': 3,
  '5A': 3, '5B': 3, '6A': 3, '6B': 3, '6C': 3, '7A': 3, '7B': 3, '7C': 3,
  '8A': 3, '8C': 3, '8D': 3, '8E': 3, '9': 3,
};

const HIGH_SCORES: Record<string, number> = Object.fromEntries(
  Object.keys(LOW_SCORES).map((k) => [k, 10])
);

beforeEach(() => {
  useCSIStore.setState({ ...initialState, records: [] });
});

describe('useCSIStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no follow-up when no scores supplied', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.followUp).toBeUndefined();
      expect(record.status).toBe('closed');
    });

    it('derives score/rating from a supplied scores map', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: HIGH_SCORES }));

      expect(record.rating).toBe('Excellent');
      expect(typeof record.totalScore).toBe('number');
      expect(record.followUp).toBeUndefined();
      expect(record.status).toBe('closed');
    });

    it('auto-spawns an Open follow-up when the derived rating is low', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));

      expect(['Fair', 'Needs Improvement']).toContain(record.rating);
      expect(record.followUp).toBeDefined();
      expect(record.followUp!.status).toBe('Open');
      expect(record.followUp!.stateHistory ?? []).toHaveLength(0);
      expect(record.status).toBe('open');
    });

    it('auto-spawns a follow-up from a manually supplied low rating (no scores map)', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ rating: 'Needs Improvement', score: 0.6 }));

      expect(record.followUp).toBeDefined();
      expect(record.followUp!.status).toBe('Open');
      expect(record.status).toBe('open');
    });
  });

  describe('updateRecord — legacy score preservation', () => {
    it('does not touch score/rating/followUp when updating without a scores map', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ score: '0.782', rating: 'Fair' }));
      expect(record.followUp).toBeDefined(); // Fair triggers auto-spawn

      store.updateRecord(record.id, { obs: 'Updated observation only' });

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.score).toBe('0.782');
      expect(updated.rating).toBe('Fair');
      expect(updated.obs).toBe('Updated observation only');
      expect(updated.followUp).toEqual(record.followUp);
    });

    it('recomputes score/rating when a full scores map is supplied on update', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ score: '0.6', rating: 'Needs Improvement' }));

      store.updateRecord(record.id, { scores: HIGH_SCORES });

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.rating).toBe('Excellent');
    });
  });

  describe('updateFollowUp', () => {
    it('merges ownership fields into an existing follow-up', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));

      store.updateFollowUp(record.id, { owner: 'Alice', assignedDept: 'IED / QAQC', dueDate: '2026-10-01' });

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp!.owner).toBe('Alice');
      expect(updated.followUp!.assignedDept).toBe('IED / QAQC');
      expect(updated.followUp!.dueDate).toBe('2026-10-01');
      expect(updated.followUp!.status).toBe('Open');
    });

    it('creates a follow-up on demand when the record has none (manual admin action)', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord());
      expect(record.followUp).toBeUndefined();

      store.updateFollowUp(record.id, { owner: 'Alice' });

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp).toBeDefined();
      expect(updated.followUp!.owner).toBe('Alice');
      expect(updated.followUp!.status).toBe('Open');
    });
  });

  describe('transitionFollowUp', () => {
    it('walks Open -> In Progress via forward, recording history', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));

      store.transitionFollowUp(record.id, 'In Progress', 'Alice', 'started investigation', 'forward');

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp!.status).toBe('In Progress');
      expect(updated.status).toBe('in_progress');
      expect(updated.followUp!.stateHistory).toHaveLength(1);
      expect(updated.followUp!.stateHistory![0]).toMatchObject({
        from: 'Open',
        to: 'In Progress',
        by: 'Alice',
        reason: 'started investigation',
        kind: 'forward',
      });
    });

    it('walks In Progress -> Closed via verify, setting completionDate and derived status', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));
      store.transitionFollowUp(record.id, 'In Progress', 'Alice', 'started', 'forward');

      store.transitionFollowUp(record.id, 'Closed', 'Bob', 'effectiveness verified', 'verify');

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp!.status).toBe('Closed');
      expect(updated.followUp!.completionDate).toBeTruthy();
      expect(updated.status).toBe('closed');
      expect(updated.followUp!.stateHistory).toHaveLength(2);
      expect(updated.followUp!.stateHistory![1]).toMatchObject({ from: 'In Progress', to: 'Closed', kind: 'verify' });
    });

    it('rejects In Progress back to Open', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));
      store.transitionFollowUp(record.id, 'In Progress', 'Alice', 'started', 'forward');

      store.transitionFollowUp(record.id, 'Open', 'Alice', 'insufficient evidence', 'reject');

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp!.status).toBe('Open');
      expect(updated.status).toBe('open');
      expect(updated.followUp!.stateHistory![1]).toMatchObject({ from: 'In Progress', to: 'Open', kind: 'reject' });
    });

    it('reopens a Closed follow-up back to In Progress', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord({ scores: LOW_SCORES }));
      store.transitionFollowUp(record.id, 'In Progress', 'Alice', 'started', 'forward');
      store.transitionFollowUp(record.id, 'Closed', 'Bob', 'verified', 'verify');

      store.transitionFollowUp(record.id, 'In Progress', 'Admin', 'recurrence found', 'reopen');

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp!.status).toBe('In Progress');
      expect(updated.status).toBe('in_progress');
      expect(updated.followUp!.stateHistory![2]).toMatchObject({ from: 'Closed', to: 'In Progress', kind: 'reopen' });
    });

    it('is a no-op when the record has no follow-up', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionFollowUp(record.id, 'In Progress', 'Alice', 'n/a', 'forward');

      const updated = useCSIStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.followUp).toBeUndefined();
    });
  });

  describe('deleteRecord / archiveRecord / toggleArchive', () => {
    it('removes the record', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord());
      store.deleteRecord(record.id);
      expect(useCSIStore.getState().records).toHaveLength(0);
    });

    it('toggles archive state', () => {
      const store = useCSIStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useCSIStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useCSIStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
