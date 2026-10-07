import { useCallback, useSyncExternalStore } from 'react';
import type { ViewTab } from '../types';

/**
 * A small hash router. Every screen has its own address, and so does every
 * record: `#/ncr/NCR-2026-004`. The Back button, bookmarks and links pasted
 * into chat all work. A hash is used (not a path) so the address never
 * reaches the server and the offline cache keeps working.
 */

/** Screen id -> the word shown in the address bar. */
export const SCREEN_SLUGS: Record<ViewTab, string> = {
  today: 'today',
  approvals: 'approvals',
  deviations: 'ncr',
  audit_records: 'audits',
  tuv_tracker: 'tuv',
  voc: 'client-intake',
  pms: 'csi',
  dml_manager: 'documents',
  dcr_workflow: 'dcr',
  change_control: 'change-requests',
  mrm_manager: 'management-review',
  objectives: 'objectives',
  kpi: 'kpi',
  mr_dashboard: 'mr-overview',
  users: 'users',
  tasks: 'tasks',
  workflows: 'workflows',
  compliance_map: 'iso-map',
  audit_trail: 'audit-trail',
  import_v12: 'import',
};

const SLUG_TO_SCREEN: Record<string, ViewTab> = Object.fromEntries(
  Object.entries(SCREEN_SLUGS).map(([screen, slug]) => [slug, screen as ViewTab]),
) as Record<string, ViewTab>;

export const HOME_SCREEN: ViewTab = 'today';

export interface Route {
  screen: ViewTab;
  recordId: string | null;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const screen = SLUG_TO_SCREEN[parts[0] ?? ''] ?? HOME_SCREEN;
  let recordId: string | null = null;
  if (parts[1]) {
    try {
      recordId = decodeURIComponent(parts.slice(1).join('/'));
    } catch {
      recordId = null;
    }
  }
  return { screen, recordId };
}

export function routeToHash(screen: ViewTab, recordId?: string | null): string {
  const base = `#/${SCREEN_SLUGS[screen]}`;
  return recordId ? `${base}/${encodeURIComponent(recordId)}` : base;
}

// ── Store: one cached Route object so React sees a stable snapshot ──────────

let current: Route = parseHash(typeof window === 'undefined' ? '' : window.location.hash);
const listeners = new Set<() => void>();

function refresh(): void {
  const next = parseHash(window.location.hash);
  if (next.screen === current.screen && next.recordId === current.recordId) return;
  current = next;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', refresh);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Route {
  return current;
}

/** Go to a screen (and optionally one record on it). Adds a Back step. */
export function navigate(screen: ViewTab, recordId?: string | null): void {
  const hash = routeToHash(screen, recordId);
  if (window.location.hash === hash) return;
  window.location.hash = hash;
  refresh();
}

/** Change the address without adding a Back step (for first load fixes). */
export function replaceRoute(screen: ViewTab, recordId?: string | null): void {
  const hash = routeToHash(screen, recordId);
  window.history.replaceState(null, '', hash);
  refresh();
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * For a screen that shows one open record at a time. Returns the open
 * record id from the address and a setter that keeps the address in step.
 * Passing null closes the record and goes back to the list.
 */
export function useRouteRecord(screen: ViewTab): [string | null, (id: string | null) => void] {
  const route = useRoute();
  const recordId = route.screen === screen ? route.recordId : null;
  const setRecordId = useCallback(
    (id: string | null) => navigate(screen, id),
    [screen],
  );
  return [recordId, setRecordId];
}
