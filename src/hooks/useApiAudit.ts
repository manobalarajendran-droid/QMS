import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, apiRaw } from '../lib/apiClient';
import type { AuditEntry } from '../types';

interface ServerAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}

type AuditResponse = AuditEntry[] | { auditLogs: ServerAuditLog[] };

function serializeJson(value: unknown): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function toAuditEntry(log: ServerAuditLog): AuditEntry {
  return {
    id: log.id,
    timestamp: log.timestamp,
    userId: log.userId,
    userName: log.userName || log.userId,
    action: log.action as AuditEntry['action'],
    entityType: log.entityType,
    entityId: log.entityId,
    previousValue: serializeJson(log.previousValue),
    newValue: serializeJson(log.newValue),
    reason: log.reason ?? undefined,
  };
}

function unwrapAuditEntries(data: AuditResponse): AuditEntry[] {
  if (Array.isArray(data)) return data;
  return (data.auditLogs ?? []).map(toAuditEntry);
}

// Builds the query string. An empty projectId asks for the whole organisation's trail.
function auditQuery(projectId: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Reads the server audit trail. `enabled` false = do nothing (offline mode).
 * With no projectId the server returns the organisation-wide trail.
 */
export function useApiAudit(projectId: string, enabled: boolean = Boolean(projectId)) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!enabled) {
      if (mountedRef.current) {
        setEntries([]);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuditResponse>(`/audit${auditQuery(projectId, { limit: '500' })}`);
      if (mountedRef.current) setEntries(unwrapAuditEntries(data));
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : String(err); if (msg.includes('401')) {
          window.location.hash = '#/login';
        }
        setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch audit entries');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled, projectId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => { mountedRef.current = false; };
  }, [fetchAll]);

  const fetchByEntity = useCallback(async (entityId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuditResponse>(`/audit${auditQuery(projectId, { entityId })}`);
      if (mountedRef.current) setEntries(unwrapAuditEntries(data));
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch audit entries');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [projectId]);

  const fetchByDateRange = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuditResponse>(`/audit${auditQuery(projectId, { from, to })}`);
      if (mountedRef.current) setEntries(unwrapAuditEntries(data));
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err) || 'Failed to fetch audit entries');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [projectId]);

  const exportCsv = useCallback(async () => {
    try {
      const blob = await apiRaw(
        `/audit/export${auditQuery(projectId, { format: 'csv' })}`,
      ).then((r) => r.blob());

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${projectId || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to export audit trail');
    }
  }, [projectId]);

  return { entries, loading, error, fetchByEntity, fetchByDateRange, exportCsv, refetch: fetchAll };
}
