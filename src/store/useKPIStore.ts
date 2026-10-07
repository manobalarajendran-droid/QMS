import { createRecordStore, type BaseRecord } from './createRecordStore';
import { generateRecordId } from '../lib/idGenerator';
import type { KPIFilters } from '../lib/kpiMetrics';

/**
 * KPI dashboards - the saved sets of cards people put on a screen for a
 * management review or a monthly meeting.
 *
 * A dashboard carries its cards inside it rather than in a second list. They
 * are only ever read and written together, and keeping them in one record
 * means the sync moves a whole dashboard at once instead of leaving somebody
 * looking at half of one.
 *
 * The numbers on the cards are not stored. They are worked out from the live
 * records every time, in `lib/kpiMetrics.ts`.
 */

export interface KPIWidget {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  metric: string;
  groupBy?: string | null;
  filters?: KPIFilters | null;
  position: number;
  size: string;
}

export interface KPIDashboardRecord extends BaseRecord {
  name: string;
  description: string;
  createdBy: string;
  /** Kept alongside the id so the card can show a name without a lookup. */
  createdByName: string;
  isPublic: boolean;
  widgets: KPIWidget[];
}

export const useKPIStore = createRecordStore<KPIDashboardRecord>('pta-qms:kpi-dashboards', 'kpi');

export function newWidgetId(): string {
  return generateRecordId('kpiw');
}

/** Add a card to a dashboard, or replace one that is already there. */
export function saveWidget(
  dashboard: KPIDashboardRecord,
  widget: Omit<KPIWidget, 'id' | 'position'>,
  widgetId?: string,
): KPIWidget[] {
  const widgets = dashboard.widgets || [];
  if (widgetId) {
    return widgets.map((w) => (w.id === widgetId ? { ...w, ...widget } : w));
  }
  return [...widgets, { ...widget, id: newWidgetId(), position: widgets.length }];
}
