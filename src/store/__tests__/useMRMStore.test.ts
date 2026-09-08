import { useMRMStore } from '../useMRMStore';
import type { MRMRecord } from '../../types';

const initialState = useMRMStore.getState();

function makeRecord(overrides: Partial<MRMRecord> = {}): Omit<MRMRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    meetingDate: '2026-01-01',
    meetingNo: 'MRM-TEST-01',
    chairperson: 'Test Chair',
    attendees: ['Alice', 'Bob'],
    venue: 'Test Room',
    status: 'Draft',
    agendaItems: ['Item 1'],
    inputs: {
      customerFeedback: false,
      objectivesReview: false,
      processPerformance: false,
      ncrsAndCAPAs: false,
      auditFindings: false,
      supplierPerformance: false,
      resourceAdequacy: false,
      riskOpportunities: false,
    },
    minutesSummary: '',
    decisions: '',
    actionItems: [],
    flaggedObjectiveMisses: [],
    flaggedSLABreaches: [],
    ...overrides,
  };
}

beforeEach(() => {
  useMRMStore.setState({ ...initialState, records: [] });
});

describe('useMRMStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Draft');
      expect(record.stateHistory ?? []).toHaveLength(0);
      expect(useMRMStore.getState().records).toHaveLength(1);
    });
  });

  describe('forward path via transitionStatus', () => {
    it('walks Draft -> Reviewed, recording history and reviewedBy', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Reviewed', 'Alice', 'minutes reviewed', 'forward');

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Reviewed');
      expect(updated.reviewedBy).toBe('Alice');
      expect(updated.reviewDate).toBeTruthy();
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Draft',
        to: 'Reviewed',
        by: 'Alice',
        reason: 'minutes reviewed',
        kind: 'forward',
      });
    });

    it('walks Reviewed -> Approved via verify kind, auto-setting approvedBy/approvalDate', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Reviewed' }));

      store.transitionStatus(record.id, 'Approved', 'Bob', 'effectiveness verified', 'verify');

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Approved');
      expect(updated.approvedBy).toBe('Bob');
      expect(updated.approvalDate).toBeTruthy();
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Reviewed',
        to: 'Approved',
        kind: 'verify',
      });
    });
  });

  describe('reject path', () => {
    it('returns Reviewed -> Draft via transitionStatus reject', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Reviewed', reviewedBy: 'Alice' }));

      store.transitionStatus(record.id, 'Draft', 'Alice', 'minutes incomplete', 'reject');

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Draft');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Reviewed',
        to: 'Draft',
        kind: 'reject',
      });
    });
  });

  describe('reopen path', () => {
    it('reopens from terminal Approved back to Reviewed', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Approved', approvedBy: 'GM' }));

      store.transitionStatus(record.id, 'Reviewed', 'Admin', 'action item found incomplete', 'reopen');

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Reviewed');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Approved',
        to: 'Reviewed',
        kind: 'reopen',
      });
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { minutesSummary: 'Updated summary' });

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.minutesSummary).toBe('Updated summary');
      expect(updated.meetingNo).toBe(record.meetingNo);
    });

    it('still accepts legacy status values directly (e.g. Completed)', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { status: 'Completed' });

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Completed');
    });
  });

  describe('updateStatus', () => {
    it('sets status directly via legacy path', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateStatus(record.id, 'Completed', 'legacy path');

      const updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Completed');
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useMRMStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useMRMStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useMRMStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useMRMStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useMRMStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });

  describe('action items', () => {
    it('adds, updates, and deletes an action item, logging as mrm_action', () => {
      const store = useMRMStore.getState();
      const record = store.addRecord(makeRecord());

      const item = store.addActionItem(record.id, {
        description: 'Follow up with vendor',
        owner: 'Carol',
        dueDate: '2026-02-01',
        status: 'Open',
      });

      let updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.actionItems).toHaveLength(1);
      expect(updated.actionItems[0].description).toBe('Follow up with vendor');

      store.updateActionItem(record.id, item.id, { status: 'Closed', closedAt: '2026-01-15' });
      updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.actionItems[0].status).toBe('Closed');

      store.deleteActionItem(record.id, item.id);
      updated = useMRMStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.actionItems).toHaveLength(0);
    });
  });
});
