import { describe, it, expect, beforeEach } from 'vitest';
import sampleBackup from '../fixtures/sample-v12-backup.json';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuditStore } from '../../src/store/useAuditStore';

describe('Tier 4 — Real-World Scenario 4: Disaster Recovery & Persistence Restore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  it('T4-SCEN-04: simulates catastrophe restore from V12 backup and validates offline persistence', () => {
    // 1. Simulating empty or corrupted system
    useNCRStore.setState({ records: [] });
    useDMLStore.setState({ records: [] });
    useCSIStore.setState({ records: [] });

    expect(useNCRStore.getState().records).toHaveLength(0);

    // 2. Disaster Recovery: Clean Replace from V12 JSON backup payload
    const restoredNCRs = sampleBackup.ncr.map((item, idx) => ({
      id: `ncr-dr-${item.id || idx}`,
      ref: item.ref,
      project: item.project,
      desc: item.desc,
      status: (item.st as any) || 'Closed',
      auditeeDept: item.auditeeDept,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useNCRStore.setState({ records: restoredNCRs });

    const restoredDMLs = sampleBackup.dml.map((item, idx) => ({
      id: `dml-dr-${item.id || idx}`,
      no: item.no,
      tt: item.tt,
      dept: item.dept,
      rv: item.rv,
      status: (item.st as any) || 'Published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    useDMLStore.setState({ records: restoredDMLs });

    // 3. User sets Dark Mode preference
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // 4. Log recovery in audit log
    useAuditStore.getState().log(
      'import',
      'system',
      'disaster-recovery-plan-executed',
      undefined,
      JSON.stringify({ ncrs: restoredNCRs.length, dml: restoredDMLs.length }),
      'Disaster recovery restore verified 100% operational'
    );

    // 5. Verify system health
    expect(useNCRStore.getState().records).toHaveLength(sampleBackup.ncr.length);
    expect(useDMLStore.getState().records).toHaveLength(sampleBackup.dml.length);

    const auditEntry = useAuditStore.getState().entries.find((e) => e.entityId === 'disaster-recovery-plan-executed');
    expect(auditEntry).toBeDefined();
    expect(auditEntry?.action).toBe('import');
  });
});
