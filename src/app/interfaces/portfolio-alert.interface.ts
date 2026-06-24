export type PortfolioAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type PortfolioAlertCategory = 'overdue_recent' | 'due_today' | 'due_soon';
export type PortfolioAlertRealtimeReason =
  | 'client_assigned'
  | 'client_unassigned'
  | 'client_bracket_updated'
  | 'client_action_registered'
  | 'client_personal_updated'
  | 'installment_payment_updated'
  | 'pending_updates_approved'
  | 'pending_updates_rejected';

export interface PortfolioAlertFiltersInterface {
  assignedUserId?: string | null;
  clientStatus?: string | null;
  lotStatus?: string | null;
  severity?: string | null;
  search?: string | null;
  block?: string | null;
  lot?: string | null;
}

export interface PortfolioAlertSummaryInterface {
  enabled: boolean;
  total: number;
  dueToday: number;
  dueSoon: number;
  overdueRecent: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  config: {
    daysAhead: number;
    overdueRecentDays: number;
    allowedClientStatuses: string[];
    allowedLotStatuses: string[];
  };
}

export interface PortfolioAlertItemInterface {
  id: string;
  clientId: string;
  clientName: string;
  dni: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  contractId: string | null;
  contractCode: string | null;
  block: string | null;
  lot: string | null;
  lotNumber: string | null;
  clientStatus: string | null;
  lotStatus: string | null;
  bracketName: string | null;
  installmentId: string | null;
  installmentNumber: number | null;
  dueDate: string;
  daysToDue: number;
  pendingAmount: number;
  category: PortfolioAlertCategory;
  severity: PortfolioAlertSeverity;
  reason: string;
  paymentStatus: string | null;
  saleType: string | null;
}

export interface PortfolioAlertListResponseInterface {
  items: PortfolioAlertItemInterface[];
  total: number;
  config: {
    enabled: boolean;
    daysAhead: number;
    overdueRecentDays: number;
    allowedClientStatuses: string[];
    allowedLotStatuses: string[];
  };
}

export interface PortfolioAlertRealtimePayloadInterface {
  reason: PortfolioAlertRealtimeReason;
  collector_user_id: string;
  occurred_at: string;
  client_id?: string | null;
  installment_id?: string | null;
  triggered_by_user_id?: string | null;
}

export interface PortfolioAlertRealtimeEventInterface {
  type: string;
  namespace: string;
  payload: PortfolioAlertRealtimePayloadInterface;
  meta?: Record<string, unknown>;
}
