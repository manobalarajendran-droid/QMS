import { useState, useEffect, useCallback } from 'react';
import { Loader2, ShieldAlert, RefreshCw, UserPlus, UserX, UserCheck } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../store/useAuthStore';

/**
 * Adding people and setting what they may do, on the QMS server
 * (GET /api/users, POST /api/users/invite, PUT /api/users/:id/role,
 * POST /api/users/:id/deactivate and /reactivate).
 * The server checks every change again: only an admin can add people or
 * change roles, nobody can lower their own role, and nobody can switch off
 * their own login or the last active admin. A switched-off person is never
 * deleted, so their name stays on old records and in the audit trail.
 */

const ROLES: { value: UserRole; label: string; note: string }[] = [
  { value: 'admin', label: 'Administrator', note: 'Everything, including adding people' },
  { value: 'qa_manager', label: 'QA Manager', note: 'Everything except managing users' },
  { value: 'qa_engineer', label: 'QA Engineer', note: 'Create and edit records, cannot approve' },
  { value: 'department_spoc', label: 'Department SPOC', note: 'Their own department’s records' },
  { value: 'reviewer', label: 'Reviewer', note: 'Read only, can comment' },
  { value: 'auditor', label: 'Auditor', note: 'Read only, for external audits' },
];

interface Row {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  deactivatedAt?: string | null;
}

const INPUT = 'px-2 py-1.5 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg';

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function AddPersonForm({ onAdded }: { onAdded: (email: string, tempPassword: string) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('reviewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ temporaryPassword: string }>('/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      onAdded(email.trim(), res.temporaryPassword);
      setEmail('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this person.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Add a person</h3>
      <div className="flex flex-wrap gap-2">
        <input className={`${INPUT} flex-1 min-w-48`} type="email" required placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={`${INPUT} flex-1 min-w-40`} placeholder="Name (optional)"
          value={name} onChange={(e) => setName(e.target.value)} />
        <select className={INPUT} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-accent rounded-lg disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
    </form>
  );
}

export function UserManager() {
  const { profile, isOffline } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newLogin, setNewLogin] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await apiFetch<{ users: Row[] }>('/users');
      setRows(users);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the list of people.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOffline) void load();
  }, [isOffline, load]);

  const changeRole = async (row: Row, role: UserRole) => {
    setBusyId(row.id);
    setError('');
    try {
      const { user } = await apiFetch<{ user: Row }>(`/users/${encodeURIComponent(row.id)}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role: user.role } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the role.');
    } finally {
      setBusyId(null);
    }
  };

  const setActive = async (row: Row, active: boolean) => {
    const who = row.name || row.email;
    const question = active
      ? `Switch ${who}'s login back on?`
      : `Switch off ${who}'s login? They are signed out at once and cannot sign in again until an admin switches them back on. Their name stays on old records.`;
    if (!window.confirm(question)) return;
    setBusyId(row.id);
    setError('');
    try {
      const { user } = await apiFetch<{ user: Row }>(
        `/users/${encodeURIComponent(row.id)}/${active ? 'reactivate' : 'deactivate'}`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, deactivatedAt: user.deactivatedAt ?? null } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change this login.');
    } finally {
      setBusyId(null);
    }
  };

  if (isOffline) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        People are managed on the QMS server. Sign in to the server to add people or change roles.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">People with access</h2>
        <button type="button" onClick={() => void load()} aria-label="Reload"
          className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <ShieldAlert className="w-4 h-4" /> Only an administrator can add people or change roles.
        </div>
      )}

      {isAdmin && (
        <AddPersonForm onAdded={(email, password) => { setNewLogin({ email, password }); void load(); }} />
      )}

      {newLogin && (
        <div className="text-sm bg-accent/10 border border-accent/30 rounded-lg p-3">
          <p>Added <strong>{newLogin.email}</strong>. Give them this first password privately. It is shown only once:</p>
          <code className="block mt-1 select-all">{newLogin.password}</code>
          <button type="button" className="mt-2 text-xs underline" onClick={() => setNewLogin(null)}>Hide</button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-text-secondary">No people yet.</p>
      )}

      <ul className="divide-y divide-border bg-surface border border-border rounded-xl">
        {rows.map((row) => (
          <li key={row.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${row.deactivatedAt ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-48">
              <div className="text-sm font-medium text-text-primary">
                {row.name || row.email}
                {row.deactivatedAt && (
                  <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-danger-text">Switched off</span>
                )}
              </div>
              <div className="text-xs text-text-tertiary">
                {row.email} · added {formatDate(row.createdAt)}
                {row.deactivatedAt ? ` · switched off ${formatDate(row.deactivatedAt)}` : ''}
              </div>
            </div>
            <select className={INPUT} value={row.role} disabled={!isAdmin || busyId === row.id || !!row.deactivatedAt}
              title={ROLES.find((r) => r.value === row.role)?.note}
              onChange={(e) => void changeRole(row, e.target.value as UserRole)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {isAdmin && row.id !== profile?.id && (
              <button type="button" disabled={busyId === row.id}
                onClick={() => void setActive(row, !!row.deactivatedAt)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:bg-surface-secondary disabled:opacity-50">
                {row.deactivatedAt
                  ? <><UserCheck className="w-3.5 h-3.5" /> Switch on</>
                  : <><UserX className="w-3.5 h-3.5" /> Switch off</>}
              </button>
            )}
            {busyId === row.id && <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
