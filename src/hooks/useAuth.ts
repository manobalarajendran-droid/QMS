import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { createElement, type ReactNode } from 'react';
import { useAuthStore, type UserRole } from '../store/useAuthStore';
import { registerSyncedStores } from '../lib/syncRegistry';
import { startSync, stopSync } from '../lib/qmsSync';
import { readPermissions, permissionsForRole, type Permissions } from '../lib/permissions';
import {
  apiFetch,
  clearTokens,
  getAccessToken,
  hasSession,
  logoutOnServer,
  onAuthLost,
  refreshAccessToken,
  setTokens,
} from '../lib/apiClient';

/**
 * Signing in, and who the signed-in person is.
 *
 * Normal use: sign in to the PTA QMS server (Cloudflare Worker + D1) with an
 * email and password. Accounts are added by a QMS admin; there is no
 * self sign-up. The role comes from the server, so nobody can promote
 * themselves by editing the browser.
 *
 * Offline mode ("Work offline, this PC only"): picked on the login screen.
 * One local admin, records kept in this browser only, nothing is shared.
 * The app shows a banner the whole time so nobody mistakes it for the real
 * system.
 *
 * The exported shape is the same as before, so the ~40 components that read
 * `useAuth()` did not change.
 */

const OFFLINE_KEY = 'pta-qms:mode';
const OFFLINE_VALUE = 'offline';

const ROLES: readonly UserRole[] = ['admin', 'qa_manager', 'qa_engineer', 'auditor', 'reviewer', 'department_spoc'];

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
}

export interface AuthProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string | null;
  isActive: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Kept for older screens. The server has no "waiting for approval" state. */
  isPendingApproval: boolean;
  /** True in "Work offline (this PC only)" mode. */
  isOffline: boolean;
  profile: AuthProfile | null;
  /** What this user may do (from the server). */
  permissions: Permissions;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  /** Switch to offline mode (login screen button). */
  workOffline: () => void;
}

// ── Offline flag ────────────────────────────────────────────────────────────

function readOffline(): boolean {
  try {
    return localStorage.getItem(OFFLINE_KEY) === OFFLINE_VALUE;
  } catch {
    return false;
  }
}

function writeOffline(on: boolean): void {
  try {
    if (on) localStorage.setItem(OFFLINE_KEY, OFFLINE_VALUE);
    else localStorage.removeItem(OFFLINE_KEY);
  } catch {
    // Storage blocked: offline mode then lasts until reload.
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

function toRole(role: string): UserRole {
  return (ROLES as readonly string[]).includes(role) ? (role as UserRole) : 'reviewer';
}

function toProfile(user: AuthUser): AuthProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.name || user.email.split('@')[0],
    role: toRole(user.role),
    department: null,
    isActive: true,
  };
}

const OFFLINE_USER: AuthUser = {
  id: 'local-admin',
  email: 'local@planttech',
  name: 'Offline user (this PC only)',
  role: 'admin',
  orgId: 'local',
};

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState<boolean>(readOffline);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [serverPerms, setServerPerms] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !readOffline() && hasSession());
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  // Restore a saved session on load.
  useEffect(() => {
    if (offline || !hasSession()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    apiFetch<{ user: AuthUser; permissions?: unknown }>('/auth/me')
      .then((r) => { if (!cancelled) { setUser(r.user); setServerPerms(r.permissions ?? null); } })
      .catch(() => { if (!cancelled) clearTokens(); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [offline]);

  // Session gone for good (refresh failed) -> back to the login screen.
  useEffect(() => onAuthLost(() => setUser(null)), []);

  const active = offline ? OFFLINE_USER : user;

  // Keep the local identity store in step: role-gated buttons read from it.
  useEffect(() => {
    if (!active) return;
    const profile = toProfile(active);
    setCurrentUser({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      signatureVerified: false,
    });
  }, [active, setCurrentUser]);

  // Sync only for a real server login, never in offline mode.
  const userId = offline ? null : user?.id;
  useEffect(() => {
    if (!userId) return;
    registerSyncedStores();
    void startSync();
    return () => stopSync();
  }, [userId]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setTokens(r.accessToken, r.refreshToken);
    writeOffline(false);
    setOffline(false);
    setUser(r.user);
  }, []);

  const register = useCallback(async () => {
    throw new Error('Ask your QMS admin to add you.');
  }, []);

  const logout = useCallback(() => {
    stopSync();
    void logoutOnServer();
    setServerPerms(null);
    writeOffline(false);
    setOffline(false);
    setUser(null);
  }, []);

  const refreshToken = useCallback(async () => {
    if (!(await refreshAccessToken())) throw new Error('Your session has ended. Please sign in again.');
  }, []);

  const workOffline = useCallback(() => {
    writeOffline(true);
    setOffline(true);
  }, []);

  const permissions = useMemo(
    () => (active ? readPermissions(offline ? null : serverPerms, active.role) : permissionsForRole('')),
    [active, offline, serverPerms],
  );

  const value = useMemo<AuthState>(
    () => ({
      user: active,
      token: offline ? null : getAccessToken(),
      isAuthenticated: Boolean(active),
      isLoading,
      isPendingApproval: false,
      isOffline: offline,
      profile: active ? toProfile(active) : null,
      permissions,
      login,
      register,
      logout,
      refreshToken,
      workOffline,
    }),
    [active, offline, isLoading, permissions, login, register, logout, refreshToken, workOffline],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

// ── Hook ────────────────────────────────────────────────────────────────────

const SIGNED_OUT: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isPendingApproval: false,
  isOffline: false,
  profile: null,
  permissions: permissionsForRole(''),
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshToken: async () => {},
  workOffline: () => {},
};

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? SIGNED_OUT;
}
