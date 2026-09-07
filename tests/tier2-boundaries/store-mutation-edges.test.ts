import { describe, it, expect, beforeEach } from 'vitest';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';

describe('Tier 2 — Boundary & Corner Cases: Store Mutation Edges', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('T2-MUT-01: updating a non-existent ID does not crash or corrupt store', () => {
    const store = useNCRStore.getState();
    const initialRecords = [...store.records];

    expect(() => {
      useNCRStore.getState().updateRecord('non-existent-id-99999', {
        desc: 'Ghost update',
      });
    }).not.toThrow();

    expect(useNCRStore.getState().records).toEqual(initialRecords);
  });

  it('T2-MUT-02: deleting a non-existent ID is a safe no-op', () => {
    const store = useDCRStore.getState();
    const countBefore = store.records.length;

    expect(() => {
      useDCRStore.getState().deleteRecord('non-existent-dcr-id');
    }).not.toThrow();

    expect(useDCRStore.getState().records.length).toBe(countBefore);
  });

  it('T2-MUT-03: handles rapid double deletion safely', () => {
    const dcr = useDCRStore.getState().addRecord({
      docNo: 'PTA-DOUBLE-DEL',
      title: 'Double Deletion Test',
      requestor: 'QA',
      department: 'Quality',
      changeDescription: 'Testing double deletion',
      reason: 'Edge test',
      status: 'Draft',
    });

    expect(useDCRStore.getState().records.some((r) => r.id === dcr.id)).toBe(true);

    // First deletion
    useDCRStore.getState().deleteRecord(dcr.id);
    expect(useDCRStore.getState().records.some((r) => r.id === dcr.id)).toBe(false);

    // Second deletion of same ID
    expect(() => {
      useDCRStore.getState().deleteRecord(dcr.id);
    }).not.toThrow();
  });

  it('T2-MUT-04: empty partial update {} preserves all existing fields intact', () => {
    const ncr = useNCRStore.getState().addRecord({
      ref: 'NCR-EMPTY-UPDATE',
      project: 'Project Alpha',
      desc: 'Important description',
      status: 'Open',
      auditeeDept: 'Operations',
    });

    useNCRStore.getState().updateRecord(ncr.id, {});

    const updated = useNCRStore.getState().records.find((r) => r.id === ncr.id);
    expect(updated?.desc).toBe('Important description');
    expect(updated?.ref).toBe('NCR-EMPTY-UPDATE');
    expect(updated?.status).toBe('Open');

    useNCRStore.getState().deleteRecord(ncr.id);
  });

  it('T2-MUT-05: preserves unicode characters, em-dashes, and Arabic text in fields', () => {
    const arabicProject = 'مشروع توسعة مصفاة ينبع — Phase IV ★ ✔';
    const arabicDesc = 'عدم مطابقة في عزم ربط مسامير الفلنجات — Torque check failed';

    const ncr = useNCRStore.getState().addRecord({
      ref: 'NCR-UNICODE-★',
      project: arabicProject,
      desc: arabicDesc,
      status: 'Open',
      auditeeDept: 'Operations',
    });

    const retrieved = useNCRStore.getState().records.find((r) => r.id === ncr.id);
    expect(retrieved?.project).toBe(arabicProject);
    expect(retrieved?.desc).toBe(arabicDesc);
    expect(retrieved?.ref).toContain('★');

    useNCRStore.getState().deleteRecord(ncr.id);
  });
});
