import { APP_PERMISSIONS, APP_ROLES } from '../constants';

export type AppRole = (typeof APP_ROLES)[number];
export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const PERMISSION_GROUP_DICTIONARY = {
  base: [
    'view_dashboard',
    'view_general_portfolio',
    'view_collector_portfolio',
    'view_messaging',
  ],
  imports: [
    'manage_general_imports',
    'manage_portfolio_imports',
  ],
  system: [
    'manage_system',
    'manage_agentllm',
    'manage_brackets',
    'manage_actions',
    'manage_users',
  ],
} as const satisfies Record<string, readonly AppPermission[]>;

export const ROLE_PERMISSION_DICTIONARY: Record<AppRole, readonly AppPermission[]> = {
  admin: [
    ...PERMISSION_GROUP_DICTIONARY.base,
    ...PERMISSION_GROUP_DICTIONARY.imports,
    ...PERMISSION_GROUP_DICTIONARY.system,
  ],
  super_collector: [
    ...PERMISSION_GROUP_DICTIONARY.base,
    ...PERMISSION_GROUP_DICTIONARY.imports,
    'manage_system',
    'manage_brackets',
    'manage_actions',
    'manage_users',
  ],
  collector: [
    ...PERMISSION_GROUP_DICTIONARY.base,
    'manage_portfolio_imports',
  ],
};
