import { useAuth } from './useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { permissionsForRole, type Permissions } from '../lib/permissions';

export interface CurrentUser {
  name: string;
  role: string;
  /** What this user may do. Use it to hide buttons they cannot use. */
  can: Permissions;
}

/**
 * Who is using the app now. The server login wins; the local profile is the
 * fallback. Returns an empty name (never a made-up one) when nobody is known.
 */
export function useCurrentUser(): CurrentUser {
  const { user, permissions } = useAuth();
  const local = useAuthStore((s) => s.currentUser);
  if (user) return { name: user.name ?? '', role: user.role ?? 'viewer', can: permissions };
  if (local) return { name: local.displayName ?? '', role: local.role ?? 'viewer', can: permissionsForRole(local.role ?? 'viewer') };
  return { name: '', role: 'viewer', can: permissionsForRole('viewer') };
}
