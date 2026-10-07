/**
 * The one way the app talks to the PTA QMS server (Cloudflare Worker + D1).
 *
 * - Base address: VITE_API_URL if set, else `/api` in a production build
 *   (same site as the Worker) and `http://127.0.0.1:8787/api` in `npm run dev`
 *   (the local `wrangler dev`).
 * - Sends the signed-in person's access token.
 * - On a 401 it tries the refresh token (again on network/server errors). Only
 *   a 401 from the refresh itself sends the app back to the login screen (M7).
 */

const DEV_API_BASE = 'http://127.0.0.1:8787/api';
const PROD_API_BASE = '/api';

const ACCESS_KEY = 'pta-qms:token';
const REFRESH_KEY = 'pta-qms:refresh';

export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  const fallback = import.meta.env.DEV ? DEV_API_BASE : PROD_API_BASE;
  return (fromEnv || fallback).replace(/\/$/, '');
}

// ── Tokens ──────────────────────────────────────────────────────────────────

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private window). The session then lasts until reload.
  }
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS_KEY);
}

export function hasSession(): boolean {
  return Boolean(readStorage(ACCESS_KEY) || readStorage(REFRESH_KEY));
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  writeStorage(ACCESS_KEY, accessToken);
  if (refreshToken) writeStorage(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  writeStorage(ACCESS_KEY, null);
  writeStorage(REFRESH_KEY, null);
}

// ── "Signed out" signal ─────────────────────────────────────────────────────

type Listener = () => void;
const authLostListeners = new Set<Listener>();

/** Called when the session is gone for good (refresh failed). Returns an unsubscribe. */
export function onAuthLost(listener: Listener): () => void {
  authLostListeners.add(listener);
  return () => authLostListeners.delete(listener);
}

function signalAuthLost(): void {
  clearTokens();
  authLostListeners.forEach((l) => l());
}

// ── Refresh (one at a time, shared by every waiting call) ───────────────────

/** ok = new tokens; denied = the server said this login is over (401); unavailable = network or server trouble. */
type RefreshOutcome = 'ok' | 'denied' | 'unavailable';

const REFRESH_RETRY_MS = [1_000, 3_000];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let refreshing: Promise<RefreshOutcome> | null = null;

async function refreshTry(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const res = await fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    // Another tab may have just used the same refresh token and saved a new one.
    if (!res.ok && readStorage(REFRESH_KEY) !== refreshToken && readStorage(ACCESS_KEY)) return 'ok';
    if (res.status === 401) return 'denied';
    if (!res.ok) return 'unavailable';
    const body = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!body.accessToken) return 'unavailable';
    setTokens(body.accessToken, body.refreshToken);
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

/** M7: only a 401 from the server ends the session; network or server errors are tried again. */
function refreshOnce(): Promise<RefreshOutcome> {
  if (refreshing) return refreshing;
  const refreshToken = readStorage(REFRESH_KEY);
  if (!refreshToken) return Promise.resolve('denied');
  refreshing = (async () => {
    try {
      let outcome = await refreshTry(refreshToken);
      for (const ms of REFRESH_RETRY_MS) {
        if (outcome !== 'unavailable') break;
        await wait(ms);
        outcome = await refreshTry(readStorage(REFRESH_KEY) ?? refreshToken);
      }
      return outcome;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function refreshAccessToken(): Promise<boolean> {
  return (await refreshOnce()) === 'ok';
}

/**
 * Tells the server this login is over (its refresh token stops working), then
 * clears the tokens here. Never throws: signing out must always work.
 */
export async function logoutOnServer(): Promise<void> {
  const refreshToken = readStorage(REFRESH_KEY);
  clearTokens();
  if (!refreshToken) return;
  try {
    await fetch(`${getApiBase()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Offline: the token still runs out on its own.
  }
}

// ── Requests ────────────────────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function send(path: string, options: RequestInit | undefined, json: boolean): Promise<Response> {
  const token = getAccessToken();
  const isForm = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  return fetch(`${getApiBase()}${normalizePath(path)}`, {
    ...options,
    headers: {
      ...(json && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}

async function sendWithRefresh(path: string, options: RequestInit | undefined, json: boolean): Promise<Response> {
  let res = await send(path, options, json);
  if (res.status !== 401 || !readStorage(REFRESH_KEY)) {
    if (res.status === 401 && getAccessToken()) signalAuthLost();
    return res;
  }
  const outcome = await refreshOnce();
  if (outcome !== 'ok') {
    // Signed out only when the server refused the login, not when it could not be reached.
    if (outcome === 'denied') signalAuthLost();
    return res;
  }
  res = await send(path, options, json);
  if (res.status === 401) signalAuthLost();
  return res;
}

export class ApiError extends Error {
  readonly status: number;
  /** The server's JSON answer, when there was one (for example the 409 conflict list). */
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
  const message = body?.message || body?.error || res.statusText || `Request failed (${res.status})`;
  return new ApiError(message, res.status, body ?? undefined);
}

// ── "Saved, but the history log failed" signal (M6) ───────────────────────

const auditListeners = new Set<(message: string) => void>();

/** Called when a change was saved but its history-log entry failed. Returns an unsubscribe. */
export function onAuditFailed(listener: (message: string) => void): () => void {
  auditListeners.add(listener);
  return () => auditListeners.delete(listener);
}

function checkAudit(res: Response): void {
  if (res.headers.get('X-Audit-Failed') !== '1') return;
  const message = 'Your change was saved, but the history log entry failed. Please tell your QMS admin.';
  console.warn(`[api] ${message}`);
  auditListeners.forEach((l) => l(message));
}

/** JSON request. Throws ApiError (with .status) when the server says no. */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await sendWithRefresh(path, options, true);
  if (!res.ok) throw await errorFrom(res);
  checkAudit(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Raw response (for file downloads and uploads), with the same login handling. */
export async function apiRaw(path: string, options?: RequestInit): Promise<Response> {
  const res = await sendWithRefresh(path, options, false);
  if (!res.ok) throw await errorFrom(res);
  return res;
}
