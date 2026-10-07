import { createRecordStore, type BaseRecord } from './createRecordStore';

/**
 * Customer complaints, and the numbers the management review asks for.
 *
 * The charts on the complaints screen used to come from a `/complaints/trending`
 * endpoint on the old server. `computeTrending()` below works the same numbers
 * out from the records themselves, so the screen shows the same six panels
 * without needing a server.
 */

export interface ComplaintRecord extends BaseRecord {
  productName: string;
  reportDate: string;
  severity: string;
  description: string;
  reporterType: string;
  investigationStatus: string;
  rootCause?: string;
  closedAt?: string;
}

export interface ComplaintTrendingData {
  byMonth: { month: string; count: number }[];
  bySeverity: Record<string, number>;
  byProduct: { product: string; count: number }[];
  /** Average days from report to close, over complaints that are closed. */
  meanTimeToResolution: number;
  openCount: number;
  closedCount: number;
  total: number;
}

const CLOSED_STATUSES = new Set(['closed', 'complete', 'completed']);

function isClosed(c: ComplaintRecord): boolean {
  return CLOSED_STATUSES.has((c.investigationStatus || '').toLowerCase());
}

export function computeTrending(records: ComplaintRecord[]): ComplaintTrendingData {
  const bySeverity: Record<string, number> = { minor: 0, major: 0, critical: 0 };
  const monthCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();

  let closedCount = 0;
  let resolutionDaysTotal = 0;
  let resolvedWithDates = 0;

  for (const c of records) {
    bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;

    // YYYY-MM, so the months sort correctly without parsing them again.
    const month = (c.reportDate || c.createdAt || '').slice(0, 7);
    if (month) monthCounts.set(month, (monthCounts.get(month) || 0) + 1);

    const product = c.productName || 'Unspecified';
    productCounts.set(product, (productCounts.get(product) || 0) + 1);

    if (isClosed(c)) {
      closedCount += 1;
      const closed = c.closedAt || c.updatedAt;
      if (c.reportDate && closed) {
        const days = (new Date(closed).getTime() - new Date(c.reportDate).getTime()) / 86400000;
        if (Number.isFinite(days) && days >= 0) {
          resolutionDaysTotal += days;
          resolvedWithDates += 1;
        }
      }
    }
  }

  return {
    byMonth: [...monthCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
    bySeverity,
    // Only the worst offenders fit on the bar chart.
    byProduct: [...productCounts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([product, count]) => ({ product, count })),
    meanTimeToResolution:
      resolvedWithDates > 0 ? Math.round(resolutionDaysTotal / resolvedWithDates) : 0,
    openCount: records.length - closedCount,
    closedCount,
    total: records.length,
  };
}

export const useComplaintStore = createRecordStore<ComplaintRecord>(
  'qatrial:complaint-records',
  'cmp',
);
