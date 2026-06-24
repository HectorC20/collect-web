const DEFAULT_BACKEND_HOST = '127.0.0.1';
const DEFAULT_API_PORT = '8700';
const DEFAULT_REVERB_PORT = '5173';
const DEFAULT_REVERB_APP_KEY = '1femnzbpsk2hdwhtzoxi';
const DEFAULT_HTTP_PROTOCOL: 'http' | 'https' = 'http';
const DEFAULT_WS_PROTOCOL: 'ws' | 'wss' = 'ws';

export const KSOCKETHTTP = `${DEFAULT_HTTP_PROTOCOL}://${DEFAULT_BACKEND_HOST}:${DEFAULT_API_PORT}`;
export const KSOCKETWS = `${DEFAULT_WS_PROTOCOL}://${DEFAULT_BACKEND_HOST}:${DEFAULT_REVERB_PORT}`;
export const KSOCKET = KSOCKETHTTP;
export const REVERB_CONFIG = {
  appKey: DEFAULT_REVERB_APP_KEY,
  authUrl: `${KSOCKETHTTP}/api/broadcasting/auth`,
  wsUrl: KSOCKETWS,
  host: DEFAULT_BACKEND_HOST,
  port: Number(DEFAULT_REVERB_PORT),
  wsProtocol: DEFAULT_WS_PROTOCOL,
} as const;
export const KAPI= '/api/';
export const AUTH_ROUTE = '/auth';
export const DASHBOARD_ROUTE = '/dashboard';
export const CLIENT_DETAIL_ROUTE = '/client/';

export const MORO_DEFAULT_DAYS = 15;

export const APP_ROLES = ['admin', 'collector', 'super_collector'] as const;
export const APP_PERMISSIONS = [
  'view_dashboard',
  'view_general_portfolio',
  'view_collector_portfolio',
  'manage_general_imports',
  'manage_portfolio_imports',
  'view_messaging',
  'manage_system',
  'manage_agentllm',
  'manage_brackets',
  'manage_actions',
  'manage_users',
] as const;

export const DEFAULT_APP_ROLE = 'collector' as const;
export const tokenCookie = 'auth_token';
