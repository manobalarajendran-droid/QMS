import { describe, it, expect } from 'vitest';
import { useCSIStore } from '../store/useCSIStore';

// Exact implementation from src/components/compliance/CSIDashboard.tsx:5-8
function normalizeScore(score: unknown): number {
  const numericScore = Number(score) || 0;
  return numericScore <= 1 ? Math.round(numericScore * 100) : Math.round(numericScore);
}

describe('CSIDashboard normalizeScore Boundary & Stress Suite', () => {
  it('correctly handles standard decimal inputs [0.0 - 1.0]', () => {
    expect(normalizeScore(0.88)).toBe(88);
    expect(normalizeScore('0.88')).toBe(88);
    expect(normalizeScore('0.90')).toBe(90);
    expect(normalizeScore('0.781')).toBe(78);
    expect(normalizeScore(0.5)).toBe(50);
    expect(normalizeScore(0.001)).toBe(0);
  });

  it('correctly handles integer percentage inputs [2 - 100]', () => {
    expect(normalizeScore(88)).toBe(88);
    expect(normalizeScore('88')).toBe(88);
    expect(normalizeScore(50)).toBe(50);
    expect(normalizeScore('50')).toBe(50);
    expect(normalizeScore(100)).toBe(100);
    expect(normalizeScore('100')).toBe(100);
  });

  it('handles falsy, null, undefined, NaN, and non-numeric strings safely returning 0', () => {
    expect(normalizeScore(null)).toBe(0);
    expect(normalizeScore(undefined)).toBe(0);
    expect(normalizeScore(NaN)).toBe(0);
    expect(normalizeScore('')).toBe(0);
    expect(normalizeScore('   ')).toBe(0);
    expect(normalizeScore('abc')).toBe(0);
    expect(normalizeScore('100%')).toBe(0);
    expect(normalizeScore({})).toBe(0);
    expect(normalizeScore([])).toBe(0);
    expect(normalizeScore(false)).toBe(0);
  });

  it('documents critical edge cases: score = 1, boolean true, and negative values', () => {
    expect(normalizeScore(1)).toBe(100);
    expect(normalizeScore('1')).toBe(100);
    expect(normalizeScore(1.0)).toBe(100);
    expect(normalizeScore(true)).toBe(100);
    expect(normalizeScore(-1)).toBe(-100);
    expect(normalizeScore(-0.5)).toBe(-50);
    expect(normalizeScore(-10)).toBe(-1000);
    expect(normalizeScore(1000)).toBe(1000);
  });

  it('computes expected 83%q average score across actual seed records', () => {
    const seedRecords = useCSIStore.getState().records;
    expect(seedRecords.length).toBe(15);
    const sum = seedRecords.reduce((acc, r) => acc + normalizeScore(r.score), 0);
    const avg = Math.round(sum / seedRecords.length);
    expect(avg).toBe(83);
  });
});
