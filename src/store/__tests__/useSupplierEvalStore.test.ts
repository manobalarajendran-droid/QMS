import { useSupplierEvalStore } from '../useSupplierEvalStore';
import type { SupplierEvalRecord } from '../../types';

const initialState = useSupplierEvalStore.getState();

function makeRecord(overrides: Partial<SupplierEvalRecord> = {}): Omit<SupplierEvalRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Test Supplier',
    category: 'Subcontractor',
    status: 'Under Evaluation',
    score: 0,
    lastEvalDate: '2026-01-01',
    nextEvalDate: '2027-01-01',
    contactPerson: 'Jane Doe',
    email: 'jane@testsupplier.com',
    findings: '',
    ...overrides,
  };
}

beforeEach(() => {
  useSupplierEvalStore.setState({ ...initialState, records: [] });
});

describe('useSupplierEvalStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Under Evaluation');
    });
  });

  describe('approveSupplier', () => {
    it('sets status to Approved and records approval metadata + stateHistory', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      store.approveSupplier(record.id, 'QA Manager', 'Meets all criteria');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Approved');
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalDate).toBeTruthy();
      expect(updated.approvalComments).toBe('Meets all criteria');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Under Evaluation',
        to: 'Approved',
        by: 'QA Manager',
        reason: 'Meets all criteria',
        kind: 'verify',
      });
    });
  });

  describe('markConditional', () => {
    it('sets status to Conditional and records stateHistory without writing ApprovalMetadata fields', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      store.markConditional(record.id, 'QA Manager', 'Minor documentation gaps');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Conditional');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Under Evaluation',
        to: 'Conditional',
        by: 'QA Manager',
        reason: 'Minor documentation gaps',
        kind: 'forward',
      });
      expect(updated.approvedBy).toBeUndefined();
      expect(updated.approvalDate).toBeUndefined();
      expect(updated.approvalComments).toBeUndefined();
    });
  });

  describe('rejectSupplier', () => {
    it('sets status to Rejected and records rejection metadata + stateHistory, not approval metadata', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      store.rejectSupplier(record.id, 'QA Manager', 'Failed evaluation criteria');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Rejected');
      expect(updated.rejectedBy).toBe('QA Manager');
      expect(updated.rejectionDate).toBeTruthy();
      expect(updated.rejectionReason).toBe('Failed evaluation criteria');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Under Evaluation',
        to: 'Rejected',
        by: 'QA Manager',
        reason: 'Failed evaluation criteria',
        kind: 'reject',
      });

      // Lock in the bug fix: reject must not write approval fields.
      expect(updated.approvedBy).toBeUndefined();
      expect(updated.approvalDate).toBeUndefined();
      expect(updated.approvalComments).toBeUndefined();
    });
  });

  describe('reopenSupplier', () => {
    it('resets status to Under Evaluation and records a reopen stateHistory entry', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Approved' }));

      store.reopenSupplier(record.id, 'QA Manager', 'Re-evaluation triggered by updated requirements');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Under Evaluation');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Approved',
        to: 'Under Evaluation',
        by: 'QA Manager',
        reason: 'Re-evaluation triggered by updated requirements',
        kind: 'reopen',
      });
    });

    it('can reopen from a Conditional or Rejected terminal branch', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Conditional' }));

      store.reopenSupplier(record.id, 'QA Manager', 'Corrective action verified complete');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Under Evaluation');
      expect(updated.stateHistory![0].from).toBe('Conditional');
    });
  });

  describe('transitionStatus', () => {
    it('moves status and appends a typed stateHistory entry for arbitrary transitions', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Approved', 'Admin', 'Direct approval', 'verify');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Approved');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Under Evaluation',
        to: 'Approved',
        by: 'Admin',
        reason: 'Direct approval',
        kind: 'verify',
      });
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useSupplierEvalStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Conditional', 'QA', 'first', 'forward');
      store.transitionStatus(record.id, 'Under Evaluation', 'QA', 'second', 'reopen');

      const updated = useSupplierEvalStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });
  });
});
