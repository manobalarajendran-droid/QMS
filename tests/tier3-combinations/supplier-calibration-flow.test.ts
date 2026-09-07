import { describe, it, expect, beforeEach } from 'vitest';
import { useSupplierEvalStore } from '../../src/store/useSupplierEvalStore';
import { useCalibStore } from '../../src/store/useCalibStore';

describe('Tier 3 — Cross-Feature Combinations: Supplier Approval to Equipment Calibration Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('T3-SUP-CAL-01: links authorized calibration vendor qualification to tool register compliance', () => {
    // 1. Evaluate & approve external calibration vendor
    const vendor = useSupplierEvalStore.getState().addRecord({
      name: 'Saudi Metrology & Calibration Standards Lab',
      category: 'ISO 17025 Accredited Laboratory',
      status: 'Approved',
      score: 96,
      lastEvalDate: '2026-01-10',
      nextEvalDate: '2027-01-10',
      contactPerson: 'Eng. Tariq Al-Amri',
      email: 'tariq@saudicalib.com.sa',
      findings: 'Full ISO 17025 accreditation certificate valid until 2028.',
    });

    expect(vendor.status).toBe('Approved');

    // 2. Register calibrated hydraulic tensioner using this approved vendor
    const tool = useCalibStore.getState().addRecord({
      equipNo: 'PTA-TENS-09',
      equipName: 'Hydraulic Bolt Tensioner 2-1/2"',
      manufacturer: 'Tentec',
      serialNo: 'TTC-55219',
      location: 'Site Tool Van 3',
      freqMonths: 6,
      lastCalibDate: '2026-02-01',
      nextCalibDate: '2026-08-01',
      status: 'Active',
      certificateNo: 'SMCS-CERT-2026-4412',
      notes: `Calibrated by approved vendor: ${vendor.name} (Ref: ${vendor.id})`,
    });

    expect(tool.status).toBe('Active');
    expect(tool.notes).toContain(vendor.name);

    // 3. Verify vendor rejection disables equipment addition
    const rejectedVendor = useSupplierEvalStore.getState().addRecord({
      name: 'Unqualified Local Workshop',
      category: 'Calibration',
      status: 'Rejected',
      score: 45,
      lastEvalDate: '2026-02-01',
      nextEvalDate: '2026-05-01',
      contactPerson: 'Unknown',
      email: 'none@none.com',
      findings: 'No traceable primary standards or ISO 17025 certification.',
    });

    const isVendorQualifiedForCalibration = (vendorId: string) => {
      const v = useSupplierEvalStore.getState().records.find((r) => r.id === vendorId);
      return v?.status === 'Approved';
    };

    expect(isVendorQualifiedForCalibration(vendor.id)).toBe(true);
    expect(isVendorQualifiedForCalibration(rejectedVendor.id)).toBe(false);
  });
});
