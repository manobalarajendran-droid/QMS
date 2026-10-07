/** What a user may do. The server sends this with /auth/me; it is the real rule. */
export type Permission = 'canView' | 'canEdit' | 'canApprove' | 'canAdmin' | 'canDelete' | 'canSign' | 'canExport';
export type Permissions = Record<Permission, boolean>;

export const NO_PERMISSIONS: Permissions = {
  canView: false, canEdit: false, canApprove: false, canAdmin: false, canDelete: false, canSign: false, canExport: false,
};

/** Copy of the server table, used only until the server answers or in offline mode. */
const BY_ROLE: Record<string, Permissions> = {
  admin:           { canView: true, canEdit: true,  canApprove: true,  canAdmin: true,  canDelete: true,  canSign: true,  canExport: true },
  qa_manager:      { canView: true, canEdit: true,  canApprove: true,  canAdmin: false, canDelete: true,  canSign: true,  canExport: true },
  qa_engineer:     { canView: true, canEdit: true,  canApprove: false, canAdmin: false, canDelete: false, canSign: true,  canExport: true },
  auditor:         { canView: true, canEdit: false, canApprove: false, canAdmin: false, canDelete: false, canSign: false, canExport: true },
  reviewer:        { canView: true, canEdit: false, canApprove: true,  canAdmin: false, canDelete: false, canSign: true,  canExport: false },
  department_spoc: { canView: true, canEdit: true,  canApprove: false, canAdmin: false, canDelete: false, canSign: true,  canExport: true },
  editor:          { canView: true, canEdit: true,  canApprove: false, canAdmin: false, canDelete: false, canSign: true,  canExport: true },
  viewer:          { canView: true, canEdit: false, canApprove: false, canAdmin: false, canDelete: false, canSign: false, canExport: false },
};

export function permissionsForRole(role: string): Permissions {
  return { ...(BY_ROLE[role] ?? NO_PERMISSIONS) };
}

/** Keep only known keys with true/false values; anything else counts as "no". */
export function readPermissions(raw: unknown, role: string): Permissions {
  if (!raw || typeof raw !== 'object') return permissionsForRole(role);
  const src = raw as Record<string, unknown>;
  const out = { ...NO_PERMISSIONS };
  (Object.keys(out) as Permission[]).forEach((k) => { out[k] = src[k] === true; });
  return out;
}

/** Older name, still used by many screens. */
export type AppPermission = Permission;

/** True when this role has the right. Same table as the server. */
export function roleHasPermission(role: string | null | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  return BY_ROLE[role]?.[permission] === true;
}
