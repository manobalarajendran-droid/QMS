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

export interface PinStatus {
  hasPin: boolean;
  unlockedUntil: number;
  lockedUntil: number;
}

/** Thrown when the helper wants the PIN before showing files. */
export class PinNeededError extends Error {
  constructor() {
    super('PIN needed');
  }
}

let cachedHost: string | null = null;

/** The helper's current address, or null when the laptop helper is not running. */
export async function getHost(fresh = false): Promise<string | null> {
  if (cachedHost && !fresh) return cachedHost;
  const body = await apiFetch<{ url: string | null }>('/files-host');
  cachedHost = body.url ? body.url.replace(/\/+$/, '') : null;
  return cachedHost;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const host = await getHost();
  if (!host) throw new Error('The QMS file helper is not running. Ask the QMS admin to start it.');
  let res: Response;
  try {
    res = await fetch(host + path, {
      ...init,
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/json' },
    });
  } catch {
    cachedHost = null; // address may have changed; read it again next time
    throw new Error('Cannot reach the QMS file helper. The laptop may be off or offline.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; needPin?: boolean };
  if (res.status === 423 && body.needPin) throw new PinNeededError();
  if (!res.ok) throw new Error(body.error || `File helper error ${res.status}`);
  return body as T;
}

export function pinStatus(): Promise<PinStatus> {
  return call<PinStatus>('/pin/status');
}

export function setPin(pin: string): Promise<PinStatus> {
  return call<PinStatus>('/pin/set', { method: 'POST', body: JSON.stringify({ pin }) });
}

export function unlockPin(pin: string): Promise<PinStatus> {
  return call<PinStatus>('/pin/unlock', { method: 'POST', body: JSON.stringify({ pin }) });
}

export function resetPin(email: string): Promise<{ ok: boolean }> {
  return call<{ ok: boolean }>('/pin/reset', { method: 'POST', body: JSON.stringify({ email }) });
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
  const host = await getHost();
  if (!host) throw new Error('The QMS file helper is not running. Ask the QMS admin to start it.');
  const q = `dcr=${encodeURIComponent(dcrId)}&name=${encodeURIComponent(file.name)}`;
  let res: Response;
  try {
    res = await fetch(`${host}/draft/upload?${q}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}`, 'Content-Type': 'application/octet-stream' },
      body: file,
    });
  } catch {
    cachedHost = null;
    throw new Error('Cannot reach the QMS file helper. The laptop may be off or offline.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; needPin?: boolean };
  if (res.status === 423 && body.needPin) throw new PinNeededError();
  if (!res.ok) throw new Error(body.error || `File helper error ${res.status}`);
}

/** Downloads one file through a short-lived signed link. */
export async function fetchFile(id: string): Promise<Blob> {
  const { path } = await call<{ path: string }>(`/sign?id=${encodeURIComponent(id)}`, { method: 'POST' });
  const host = await getHost();
  const res = await fetch(host + path);
  if (!res.ok) throw new Error('Could not open the file. Try again.');
  return res.blob();
}

export type WFilesLoad = { kind: 'ready'; files: WFile[] } | { kind: 'pin'; status: PinStatus } | { kind: 'error'; message: string };

/** Reads the W: file list; says "pin" when the helper wants the PIN first. */
export async function readWFiles(): Promise<WFilesLoad> {
  try {
    await getHost(true);
    return { kind: 'ready', files: await listFiles() };
  } catch (e) {
    if (!(e instanceof PinNeededError)) return { kind: 'error', message: e instanceof Error ? e.message : 'Could not load the files.' };
    try {
      return { kind: 'pin', status: await pinStatus() };
    } catch (e2) {
      return { kind: 'error', message: e2 instanceof Error ? e2.message : 'Could not reach the file helper.' };
    }
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
