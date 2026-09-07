import { describe, it, expect, beforeEach } from 'vitest';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useDMLStore } from '../../src/store/useDMLStore';

describe('Tier 2 — Boundary & Corner Cases: Input Validation Edges', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('T2-INPUT-01: handles extreme string length (10,000 characters) without buffer overflow', () => {
    const hugeDescription = 'A'.repeat(10000);

    const record = useNCRStore.getState().addRecord({
      ref: 'NCR-HUGE-DESC',
      project: 'Stress Test Project',
      desc: hugeDescription,
      status: 'Open',
      auditeeDept: 'Quality',
    });

    const retrieved = useNCRStore.getState().records.find((r) => r.id === record.id);
    expect(retrieved?.desc.length).toBe(10000);
    expect(retrieved?.desc).toBe(hugeDescription);

    useNCRStore.getState().deleteRecord(record.id);
  });

  it('T2-INPUT-02: handles whitespace-only inputs gracefully', () => {
    const record = useNCRStore.getState().addRecord({
      ref: '   ',
      project: '\t\n   ',
      desc: 'Whitespace check',
      status: 'Open',
      auditeeDept: 'Quality',
    });

    const retrieved = useNCRStore.getState().records.find((r) => r.id === record.id);
    expect(retrieved).toBeDefined();

    // Check trimmed presence
    expect(retrieved?.ref?.trim()).toBe('');
    expect(retrieved?.project?.trim()).toBe('');

    useNCRStore.getState().deleteRecord(record.id);
  });

  it('T2-INPUT-03: handles null and undefined optional properties without crashing', () => {
    const record = useNCRStore.getState().addRecord({
      ref: 'NCR-NULL-CHECK',
      project: undefined,
      desc: 'Checking optional fields',
      status: 'Open',
      auditeeDept: undefined,
      rca: undefined,
      corrAction: undefined,
      approvedBy: undefined,
    });

    const retrieved = useNCRStore.getState().records.find((r) => r.id === record.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.approvedBy).toBeUndefined();
    expect(retrieved?.rca).toBeUndefined();

    useNCRStore.getState().deleteRecord(record.id);
  });
});
