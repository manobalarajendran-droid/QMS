// Talks to the laptop file helper that shows the Master QMS Repository (W:) READ ONLY.
// The helper's address changes when its free tunnel restarts, so it is read from
// the QMS server each time (GET /api/files-host). Code: D:\Claude Code\qms-file-store.
import { apiFetch, getAccessToken } from '../../lib/apiClient';

export interface WFile {
  id: string;
  name: string;
  folder: string;
  size: number;
  at: string;
  docNo: string | null;
}

let cachedHost: string | null = null;

/** The helper's current address, or null when the laptop helper is not running. */
export async function getHost(fresh = false): Promise<string | null> {
  if (cachedHost && !fresh) return cachedHost;
  const body = await apiFetch<{ url: string | null }>('/files-host');
  cachedHost = body.url ? body.url.replace(/\/+$/, '') : null;
  return cachedHost;
}

const NOT_RUNNING = 'The QMS file helper is not running. Ask the QMS admin to start it.';

/**
 * Fetches from the helper. When the helper was restarted it has a new address,
 * so on a network failure the address is read again and the call tried once more.
 */
async function helperFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const host = await getHost();
  if (!host) throw new Error(NOT_RUNNING);
  try {
    return await fetch(host + path, init);
  } catch {
    const fresh = await getHost(true).catch(() => null);
    if (!fresh) { cachedHost = null; throw new Error(NOT_RUNNING); }
    try {
      return await fetch(fresh + path, init);
    } catch {
      cachedHost = null; // read the address again next time
      throw new Error('Cannot reach the QMS file helper. The laptop may be off or offline.');
    }
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await helperFetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/json' },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || `File helper error ${res.status}`);
  return body as T;
}

export async function listFiles(): Promise<WFile[]> {
  const body = await call<{ files: WFile[] }>('/list');
  return body.files;
}

/** A proposed new file attached to a DCR (kept on the laptop, never on W:). */
export interface DraftFile {
  id: string;
  name: string;
  size: number;
  at: string;
  by: string;
}

export async function listDrafts(dcrId: string): Promise<DraftFile[]> {
  const body = await call<{ drafts: DraftFile[] }>(`/draft/list?dcr=${encodeURIComponent(dcrId)}`);
  return body.drafts;
}

/** Sends the raw file to the helper. Needs its own fetch: call() always sends JSON. */
export async function uploadDraft(dcrId: string, file: File): Promise<void> {
  const q = `dcr=${encodeURIComponent(dcrId)}&name=${encodeURIComponent(file.name)}`;
  const res = await helperFetch(`/draft/upload?${q}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || `File helper error ${res.status}`);
}

/** Saves an evidence file in the laptop "QMS Evidence" folder. Returns its helper id ('ev:...'). */
export async function uploadEvidence(entityType: string, entityId: string, file: File): Promise<{ id: string; size: number }> {
  const q = `type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(entityId)}&name=${encodeURIComponent(file.name)}`;
  const res = await helperFetch(`/evidence/upload?${q}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; file?: { id: string; size: number } };
  if (!res.ok || !body.file) throw new Error(body.error || `File helper error ${res.status}`);
  return body.file;
}

/** Downloads one file through a short-lived signed link. */
export async function fetchFile(id: string): Promise<Blob> {
  const { path } = await call<{ path: string }>(`/sign?id=${encodeURIComponent(id)}`, { method: 'POST' });
  const res = await helperFetch(path);
  if (!res.ok) throw new Error('Could not open the file. Try again.');
  return res.blob();
}

export type WFilesLoad = { kind: 'ready'; files: WFile[] } | { kind: 'error'; message: string };

/** Reads the W: file list from the laptop helper. */
export async function readWFiles(): Promise<WFilesLoad> {
  try {
    await getHost(true);
    return { kind: 'ready', files: await listFiles() };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Could not load the files.' };
  }
}

/** Saves a file to the user's Downloads (for types the viewer cannot show). */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
