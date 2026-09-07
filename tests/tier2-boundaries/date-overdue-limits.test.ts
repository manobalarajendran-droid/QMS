import { describe, it, expect } from 'vitest';

describe('Tier 2 — Boundary & Corner Cases: Date & Overdue Limits', () => {
  const evaluateOverdue = (targetDateStr: string, referenceTimeMs: number) => {
    const targetDate = new Date(targetDateStr);
    if (isNaN(targetDate.getTime())) {
      return { isValid: false, isOverdue: false };
    }
    return {
      isValid: true,
      isOverdue: targetDate.getTime() < referenceTimeMs,
    };
  };

  it('T2-DATE-01: identifies exact millisecond overdue boundary', () => {
    const refMs = 1772800000000;
    const pastOneMs = new Date(refMs - 1).toISOString();
    const futureOneMs = new Date(refMs + 1).toISOString();
    const exactMs = new Date(refMs).toISOString();

    expect(evaluateOverdue(pastOneMs, refMs).isOverdue).toBe(true);
    expect(evaluateOverdue(futureOneMs, refMs).isOverdue).toBe(false);
    expect(evaluateOverdue(exactMs, refMs).isOverdue).toBe(false);
  });

  it('T2-DATE-02: handles leap year date February 29th without shifting month', () => {
    const leapDate = '2028-02-29';
    const parsed = new Date(leapDate);

    expect(parsed.getFullYear()).toBe(2028);
    expect(parsed.getMonth()).toBe(1); // 0-indexed February
    expect(parsed.getDate()).toBe(29);
  });

  it('T2-DATE-03: handles non-leap year February 29th boundary', () => {
    // 2027 is not a leap year, JS Date parses 2027-02-29 as 2027-03-01
    const nonLeapDate = '2027-02-29';
    const parsed = new Date(nonLeapDate);
    expect(parsed.getMonth()).toBe(2); // shifted to March
  });

  it('T2-DATE-04: gracefully handles malformed date strings without uncaught exceptions', () => {
    const result1 = evaluateOverdue('invalid-date-string', Date.now());
    expect(result1.isValid).toBe(false);
    expect(result1.isOverdue).toBe(false);

    const result2 = evaluateOverdue('', Date.now());
    expect(result2.isValid).toBe(false);

    const result3 = evaluateOverdue('2026-13-45', Date.now());
    // JS Date invalid
    expect(result3.isValid).toBe(false);
  });
});
