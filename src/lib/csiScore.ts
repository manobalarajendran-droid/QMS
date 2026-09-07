export function normalizeScore(score: unknown): number {
  if (score == null || typeof score === 'boolean') return 0;
  let numeric = 0;
  if (typeof score === 'string') {
    let trimmed = score.trim();
    if (trimmed.endsWith('%')) trimmed = trimmed.slice(0, -1).trim();
    numeric = Number(trimmed);
  } else {
    numeric = Number(score);
  }
  if (Number.isNaN(numeric) || !Number.isFinite(numeric) || numeric <= 0) return 0;
  if (typeof score === 'string' && score.includes('%')) return Math.min(100, Math.max(0, Math.round(numeric)));
  if (numeric <= 1) return Math.min(100, Math.max(0, Math.round(numeric * 100)));
  return Math.min(100, Math.max(0, Math.round(numeric)));
}
