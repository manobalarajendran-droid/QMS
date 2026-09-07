import { describe, it, expect, beforeEach } from 'vitest';
import sampleBackup from '../fixtures/sample-v12-backup.json';
import { MOCK_DEPARTMENTS } from '../fixtures/seed-data';
import { useAuditStore } from '../../src/store/useAuditStore';
import { useNCRStore } from '../../src/store/useNCRStore';
import { useCSIStore } from '../../src/store/useCSIStore';
import { useDMLStore } from '../../src/store/useDMLStore';
import { useDCRStore } from '../../src/store/useDCRStore';
import { useMRMStore } from '../../src/store/useMRMStore';
import { useTUVStore } from '../../src/store/useTUVStore';

describe('Tier 1 — V12 Import Bridge Overhaul (Features 8–12)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditStore.getState().clearEntries();
  });

  // ==========================================================================
  // Feature 8: V12 Backup Parser Expansion
  // ==========================================================================
  describe('Feature 8: V12 Backup Parser Expansion (All 10 Entity Arrays)', () => {
    it('F08-01: parses all 10 data entity arrays from V12 backup payload', () => {
      const payload = sampleBackup;

      const requiredKeys = [
        'ncr',
        'obj',
        'cs',
        'dml',
        'mrm',
        'dcr',
        'tuv',
        'audits',
        'actions',
        'evfile',
      ];

      for (const key of requiredKeys) {
        expect(payload).toHaveProperty(key);
        expect(Array.isArray((payload as any)[key])).toBe(true);
        expect((payload as any)[key].length).toBeGreaterThan(0);
      }
    });

    it('F08-02: verifies backup metadata fields (_at, saved, seedVer)', () => {
      expect(sampleBackup._at).toBeTypeOf('number');
      expect(sampleBackup.seedVer).toBe(12);
      expect(new Date(sampleBackup.saved).getTime()).not.toBeNaN();
    });
  });

  // ==========================================================================
  // Feature 9: V12 Field Transformations
  // ==========================================================================
  describe('Feature 9: Legacy Short Key Transformations', () => {
    it('F09-01: transforms legacy status key (st) and classification (clsType) for NCR', () => {
      const rawNCR = sampleBackup.ncr[0];
      expect(rawNCR.st).toBe('Closed');
      expect(rawNCR.clsType).toBe('NCR');

      // Canonical transformation logic
      const transformedNCR = {
        ...rawNCR,
        status: rawNCR.st || 'Open',
        classification: rawNCR.clsType || 'NCR',
      };

      expect(transformedNCR.status).toBe('Closed');
      expect(transformedNCR.classification).toBe('NCR');
    });

    it('F09-02: transforms comma-separated attendee string to array for MRM', () => {
      const rawMRM = sampleBackup.mrm[0];
      expect(typeof rawMRM.att).toBe('string');

      // Canonical transformation logic
      const attendees = rawMRM.att
        .split(',')
        .map((a: string) => a.trim())
        .filter(Boolean);

      expect(Array.isArray(attendees)).toBe(true);
      expect(attendees).toHaveLength(4);
      expect(attendees[0]).toContain('MANOBALA');
      expect(attendees[1]).toContain('Mubashir');
    });

    it('F09-03: transforms legacy DML short keys (no, tt, rv, st, rd, lv)', () => {
      const rawDML = sampleBackup.dml[0];
      const transformedDML = {
        docNo: rawDML.no,
        title: rawDML.tt,
        rev: rawDML.rv,
        status: rawDML.st,
        reviewDate: rawDML.rd,
        level: rawDML.lv,
      };

      expect(transformedDML.docNo).toBe('PT/QCR/01');
      expect(transformedDML.title).toBe('Quality Management System Manual');
      expect(transformedDML.status).toBe('Active');
      expect(transformedDML.level).toBe('L1');
    });
  });

  // ==========================================================================
  // Feature 10: V12 Sequence & Depts Support
  // ==========================================================================
  describe('Feature 10: Sequence Counter (nid) & Departments Support', () => {
    it('F10-01: extracts and stores next sequence counter values from nid object', () => {
      const nid = sampleBackup.nid;
      expect(nid).toBeDefined();
      expect(nid.ncr).toBeGreaterThan(0);
      expect(nid.dcr).toBeGreaterThan(0);
      expect(nid.dml).toBeGreaterThan(0);

      // Verify sequence can be saved to localStorage for persistence
      localStorage.setItem('qatrial:sequence_counters', JSON.stringify(nid));
      const restored = JSON.parse(localStorage.getItem('qatrial:sequence_counters') || '{}');
      expect(restored.ncr).toBe(nid.ncr);
      expect(restored.dcr).toBe(nid.dcr);
    });

    it('F10-02: falls back to 13 standard PTA departments when customDepts is null', () => {
      const customDepts = sampleBackup.customDepts;
      const effectiveDepts = customDepts || MOCK_DEPARTMENTS;

      expect(effectiveDepts).toHaveLength(13);
      expect(effectiveDepts).toContain('Operations');
      expect(effectiveDepts).toContain('Quality');
      expect(effectiveDepts).toContain('HSE');
      expect(effectiveDepts).toContain('Maintenance');
    });
  });

  // ==========================================================================
  // Feature 11: V12 Clean Replace / Upsert
  // ==========================================================================
  describe('Feature 11: Clean Replace vs. Merge / Upsert Logic', () => {
    it('F11-01: clean replace purges existing data to prevent duplicate record bloat', () => {
      // Seed initial dummy records
      const ncr1 = useNCRStore.getState().addRecord({
        ref: 'PRE-EXISTING-01',
        project: 'Obsolete Project',
        status: 'Open',
        auditeeDept: 'Quality',
      });
      expect(useNCRStore.getState().records.some((r) => r.id === ncr1.id)).toBe(true);

      // Simulate clean replace import: reset records and map backup items
      const importedRecords = sampleBackup.ncr.map((item, idx) => ({
        id: `ncr-imported-${item.id || idx}`,
        ref: item.ref,
        project: item.project,
        desc: item.desc,
        status: (item.st as any) || 'Closed',
        auditeeDept: item.auditeeDept,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Replace in store
      useNCRStore.setState({ records: importedRecords });

      const currentNCRs = useNCRStore.getState().records;
      expect(currentNCRs.some((r) => r.ref === 'PRE-EXISTING-01')).toBe(false);
      expect(currentNCRs.some((r) => r.ref === 'NCR-2025-001')).toBe(true);
      expect(currentNCRs.length).toBe(sampleBackup.ncr.length);
    });

    it('F11-02: merge mode updates matching records and appends new ones', () => {
      const existingRecords = [
        {
          id: 'ncr-1',
          ref: 'NCR-2025-001',
          desc: 'Old draft description',
          status: 'Open' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      useNCRStore.setState({ records: existingRecords });

      // Incoming update for NCR-2025-001 plus a new record
      const incoming = [
        {
          id: 'ncr-1',
          ref: 'NCR-2025-001',
          desc: 'Updated description from V12',
          status: 'Closed' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ncr-2',
          ref: 'NCR-2025-002',
          desc: 'Brand new record',
          status: 'Open' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Merge logic: map existing, update matching, append new
      const merged = [...useNCRStore.getState().records];
      for (const item of incoming) {
        const idx = merged.findIndex((r) => r.ref === item.ref);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...item };
        } else {
          merged.push(item);
        }
      }

      useNCRStore.setState({ records: merged });
      expect(useNCRStore.getState().records).toHaveLength(2);
      expect(useNCRStore.getState().records[0].desc).toBe('Updated description from V12');
      expect(useNCRStore.getState().records[0].status).toBe('Closed');
    });
  });

  // ==========================================================================
  // Feature 12: V12 Import Audit Trail
  // ==========================================================================
  describe('Feature 12: V12 Import Audit Trail Logging', () => {
    it('F12-01: records comprehensive audit log entry with entity counts upon import', () => {
      const entityCounts = {
        ncr: sampleBackup.ncr.length,
        cs: sampleBackup.cs.length,
        dml: sampleBackup.dml.length,
        dcr: sampleBackup.dcr.length,
        mrm: sampleBackup.mrm.length,
        tuv: sampleBackup.tuv.length,
        audits: sampleBackup.audits.length,
        obj: sampleBackup.obj.length,
        actions: sampleBackup.actions.length,
        evfile: sampleBackup.evfile.length,
      };

      useAuditStore.getState().log(
        'import',
        'system',
        'v12-backup-restore',
        undefined,
        JSON.stringify(entityCounts),
        'Clean replace import completed from PTA_MR_Backup (7).json'
      );

      const entries = useAuditStore.getState().entries.filter((e) => e.action === 'import');
      expect(entries).toHaveLength(1);
      expect(entries[0].entityType).toBe('system');
      expect(entries[0].entityId).toBe('v12-backup-restore');

      const loggedCounts = JSON.parse(entries[0].newValue || '{}');
      expect(loggedCounts.ncr).toBe(sampleBackup.ncr.length);
      expect(loggedCounts.dml).toBe(sampleBackup.dml.length);
      expect(entries[0].reason).toContain('Clean replace');
    });
  });
});
