import { APP_ROLES, DEFAULT_APP_ROLE } from '../../shared/constants';
import { AppPermission, AppRole, ROLE_PERMISSION_DICTIONARY } from '../../shared/dictionary/main';

export type { AppPermission, AppRole } from '../../shared/dictionary/main';

export function normalizeAppRole(roleName?: string | null): AppRole {
  const normalized = (roleName ?? '').trim().toLowerCase();

  if ((APP_ROLES as readonly string[]).includes(normalized)) {
    return normalized as AppRole;
  }

  return DEFAULT_APP_ROLE;
}

export function hasPermission(roleName: string | null | undefined, permission: AppPermission): boolean {
  const role = normalizeAppRole(roleName);
  const result = ROLE_PERMISSION_DICTIONARY[role].includes(permission);
  return result;
}

export function hasAnyPermission(
  roleName: string | null | undefined,
  permissions: readonly AppPermission[] | null | undefined,
): boolean {
  if (!permissions || permissions.length === 0) {
    return true;
  }

  const result = permissions.some((permission) => hasPermission(roleName, permission));
  return result;
}
