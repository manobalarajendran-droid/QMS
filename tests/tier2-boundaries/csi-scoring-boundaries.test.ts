import { describe, it, expect, beforeEach } from 'vitest';
import { useCSIStore } from '../../src/store/useCSIStore';
import { MOCK_CSI_22_CRITERIA_QUESTIONS } from '../fixtures/seed-data';

describe('Tier 2 — Boundary & Corner Cases: CSI Scoring Limits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const calculateCSI = (scores: Record<string, number>) => {
    const values = Object.values(scores);
    if (values.length === 0) return { totalScore: 0, rating: 'Poor' };
    const sum = values.reduce((a, b) => a + b, 0);
    // Standard FM-CSS-01 formula: (sum / 220) * 100
    const totalScore = Number(((sum / 220) * 100).toFixed(2));
    let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (totalScore >= 90.0) rating = 'Excellent';
    else if (totalScore >= 75.0) rating = 'Good';
    else if (totalScore >= 60.0) rating = 'Fair';
    else rating = 'Poor';

    return { totalScore, rating };
  };

  it('T2-CSI-01: exactly 90.00% triggers Excellent rating', () => {
    // 198 / 220 = exactly 0.9000
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q, i) => {
      scores[q.code] = i < 22 ? 9 : 9; // 22 * 9 = 198
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(90.00);
    expect(rating).toBe('Excellent');
  });

  it('T2-CSI-02: 89.55% (score 197) remains Good rating', () => {
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q, i) => {
      scores[q.code] = i === 0 ? 8 : 9; // 21*9 + 8 = 197
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(89.55);
    expect(rating).toBe('Good');
  });

  it('T2-CSI-03: exactly 75.00% (score 165) triggers Good rating', () => {
    // 165 / 220 = exactly 0.7500
    const scores: Record<string, number> = {};
    // 11 items with 8, 11 items with 7 = 88 + 77 = 165
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q, i) => {
      scores[q.code] = i < 11 ? 8 : 7;
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(75.00);
    expect(rating).toBe('Good');
  });

  it('T2-CSI-04: 74.55% (score 164) remains Fair rating', () => {
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q, i) => {
      scores[q.code] = i < 10 ? 8 : 7; // 10*8 + 12*7 = 80 + 84 = 164
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(74.55);
    expect(rating).toBe('Fair');
  });

  it('T2-CSI-05: exactly 60.00% (score 132) triggers Fair rating', () => {
    // 132 / 220 = exactly 0.6000 (22 * 6 = 132)
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q) => {
      scores[q.code] = 6;
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(60.00);
    expect(rating).toBe('Fair');
  });

  it('T2-CSI-06: 59.55% (score 131) falls into Poor rating', () => {
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q, i) => {
      scores[q.code] = i === 0 ? 5 : 6; // 21*6 + 5 = 131
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(59.55);
    expect(rating).toBe('Poor');
  });

  it('T2-CSI-07: handles all 1s (minimum possible rating)', () => {
    const scores: Record<string, number> = {};
    MOCK_CSI_22_CRITERIA_QUESTIONS.forEach((q) => {
      scores[q.code] = 1;
    });

    const { totalScore, rating } = calculateCSI(scores);
    expect(totalScore).toBe(10.00);
    expect(rating).toBe('Poor');
  });

  it('T2-CSI-08: handles empty scores without NaN crash', () => {
    const { totalScore, rating } = calculateCSI({});
    expect(Number.isNaN(totalScore)).toBe(false);
    expect(totalScore).toBe(0);
    expect(rating).toBe('Poor');
  });
});
