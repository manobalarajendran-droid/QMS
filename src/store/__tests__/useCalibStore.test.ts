import { useCalibStore } from '../useCalibStore';
import type { CalibRecord } from '../../types';

const initialState = useCalibStore.getState();

function makeRecord(overrides: Partial<CalibRecord> = {}): Omit<CalibRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    equipNo: 'PTA-TEST-CAL-01',
    equipName: 'Test Gauge',
    manufacturer: 'Test Mfg',
    serialNo: 'SN-0001',
    location: 'QA Lab',
    freqMonths: 12,
    lastCalibDate: '2026-01-01',
    nextCalibDate: '2026-12-01',
    status: 'Valid',
    certificateNo: 'CERT-0001',
    notes: '',
    ...overrides,
  };
}

beforeEach(() => {
  useCalibStore.setState({ ...initialState, records: [] });
});

describe('useCalibStore', () => {
  describe('addRecord', () => {
    it('creates a record with id/timestamps and no stateHistory', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      expect(record.id).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
      expect(record.status).toBe('Valid');
      expect(record.stateHistory ?? []).toHaveLength(0);
    });

    it('defaults status to Valid when none is passed', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord({ ...makeRecord(), status: undefined as unknown as CalibRecord['status'] });

      expect(record.status).toBe('Valid');
    });
  });

  describe('updateRecord', () => {
    it('merges partial fields without touching others', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.updateRecord(record.id, { assignedTo: 'Jane Doe', assignedDept: 'Quality' });

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.assignedTo).toBe('Jane Doe');
      expect(updated.assignedDept).toBe('Quality');
      expect(updated.equipNo).toBe(record.equipNo);
    });
  });

  describe('transitionStatus', () => {
    it('records a forward stateHistory entry', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Out of Service', 'Alice', 'flagged for repair', 'forward');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Out of Service');
      expect(updated.stateHistory).toHaveLength(1);
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Valid',
        to: 'Out of Service',
        by: 'Alice',
        reason: 'flagged for repair',
        kind: 'forward',
      });
    });

    it('appends to existing stateHistory rather than replacing it', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.transitionStatus(record.id, 'Out of Service', 'Alice', 'first', 'forward');
      store.transitionStatus(record.id, 'Out of Service', 'Bob', 'second', 'forward');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.stateHistory).toHaveLength(2);
    });
  });

  describe('reportOutOfTolerance', () => {
    it('moves an in-service record to Out of Service with a forward history entry', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.reportOutOfTolerance(record.id, 'Alice', 'found out of tolerance during use');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Out of Service');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Valid',
        to: 'Out of Service',
        kind: 'forward',
      });
    });
  });

  describe('verifyReturnToService', () => {
    it('recomputes status from nextCalibDate and records approval metadata', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Out of Service', nextCalibDate: '2099-01-01' }));

      store.verifyReturnToService(record.id, 'QA Manager', 'repaired and verified');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Valid');
      expect(updated.approvedBy).toBe('QA Manager');
      expect(updated.approvalDate).toBeTruthy();
      expect(updated.approvalComments).toBe('repaired and verified');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Out of Service',
        to: 'Valid',
        kind: 'verify',
      });
    });

    it('returns to Overdue when nextCalibDate is in the past', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Out of Service', nextCalibDate: '2020-01-01' }));

      store.verifyReturnToService(record.id, 'QA Manager', 'repaired, calibration overdue');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Overdue');
    });
  });

  describe('scrapInstrument', () => {
    it('moves a record to Scrapped and records rejection metadata', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Out of Service' }));

      store.scrapInstrument(record.id, 'QA Manager', 'beyond economical repair');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Scrapped');
      expect(updated.rejectedBy).toBe('QA Manager');
      expect(updated.rejectionDate).toBeTruthy();
      expect(updated.rejectionReason).toBe('beyond economical repair');
      expect(updated.stateHistory![0]).toMatchObject({
        from: 'Out of Service',
        to: 'Scrapped',
        kind: 'forward',
      });
    });
  });

  describe('reopenFromScrap', () => {
    it('moves a Scrapped record back to Out of Service and clears rejection metadata', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord({ status: 'Out of Service' }));
      store.scrapInstrument(record.id, 'QA Manager', 'thought it was unrepairable');

      store.reopenFromScrap(record.id, 'Admin', 'reopened in error, parts now available');

      const updated = useCalibStore.getState().records.find((r) => r.id === record.id)!;
      expect(updated.status).toBe('Out of Service');
      expect(updated.rejectedBy).toBeUndefined();
      expect(updated.rejectionDate).toBeUndefined();
      expect(updated.rejectionReason).toBeUndefined();
      expect(updated.stateHistory![1]).toMatchObject({
        from: 'Scrapped',
        to: 'Out of Service',
        kind: 'reopen',
      });
    });
  });

  describe('deleteRecord', () => {
    it('removes the record', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.deleteRecord(record.id);

      expect(useCalibStore.getState().records).toHaveLength(0);
    });
  });

  describe('archive / unarchive / toggleArchive', () => {
    it('archives and unarchives a record', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.archiveRecord(record.id);
      expect(useCalibStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.unarchiveRecord(record.id);
      expect(useCalibStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });

    it('toggles archive state', () => {
      const store = useCalibStore.getState();
      const record = store.addRecord(makeRecord());

      store.toggleArchive(record.id);
      expect(useCalibStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(true);

      store.toggleArchive(record.id);
      expect(useCalibStore.getState().records.find((r) => r.id === record.id)!.isArchived).toBe(false);
    });
  });
});
