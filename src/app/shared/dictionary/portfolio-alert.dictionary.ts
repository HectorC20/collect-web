import {
  PortfolioAlertCategory,
  PortfolioAlertSeverity,
  PortfolioAlertRealtimeReason,
} from '../../interfaces/portfolio-alert.interface';

export const PORTFOLIO_ALERT_SEVERITY_LABELS: Record<PortfolioAlertSeverity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const PORTFOLIO_ALERT_CATEGORY_LABELS: Record<PortfolioAlertCategory, string> = {
  overdue_recent: 'Recién vencidos',
  due_today: 'Vencen hoy',
  due_soon: 'Por vencer',
};

export const PORTFOLIO_ALERT_REALTIME = {
  namespace: 'portfolio_alerts',
  refreshType: 'portfolio_alerts.refresh_required',
} as const;

export const PORTFOLIO_ALERT_REALTIME_REASON_LABELS: Record<PortfolioAlertRealtimeReason, string> = {
  client_assigned: 'Cliente asignado',
  client_unassigned: 'Cliente desvinculado',
  client_bracket_updated: 'Tramo actualizado',
  client_action_registered: 'Acción registrada',
  client_personal_updated: 'Datos actualizados',
  installment_payment_updated: 'Pago actualizado',
  pending_updates_approved: 'Pendientes aprobados',
  pending_updates_rejected: 'Pendientes rechazados',
};
