import { ChartConfiguration, ChartOptions } from 'chart.js';
import { HistoryMetricKey, TrendTone } from '../../interfaces/dashboard-chart.interface';

export const DASHBOARD_CHART_COLORS: Record<TrendTone, { line: string; fill: string; text: string }> = {
  primary: { line: '#6366f1', fill: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' },
  danger: { line: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  success: { line: '#22c55e', fill: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  warning: { line: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  slate: { line: '#64748b', fill: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
};

export const DASHBOARD_CHART_METRIC_CONFIG: Record<HistoryMetricKey, {
  title: string;
  description: string;
  formula: string;
  calculationNote: string;
  unit: 'currency' | 'percent' | 'days';
  decimals: string;
  tone: TrendTone;
  inverse?: boolean;
}> = {
  portfolio_total: {
    title: 'Cartera Total Pendiente',
    description: 'Evolución del saldo pendiente total',
    formula: 'Formula: SUM(saldo pendiente al cierre de la fecha).',
    calculationNote: 'Se recalcula al corte de cada fecha del rango seleccionado, considerando solo cuotas con saldo pendiente.',
    unit: 'currency',
    decimals: '1.2-2',
    tone: 'primary',
  },
  portfolio_overdue: {
    title: 'Cartera Vencida',
    description: 'Presión de la mora',
    formula: 'Formula: SUM(saldo pendiente con vencimiento menor a la fecha de corte).',
    calculationNote: 'Mide solo cuotas vencidas que siguen pendientes al cierre de cada fecha analizada.',
    unit: 'currency',
    decimals: '1.2-2',
    tone: 'danger',
    inverse: true,
  },
  recovered: {
    title: 'Recuperado Diario',
    description: 'Recuperación por fecha',
    formula: 'Formula: SUM(paid_amount donde payment_date = fecha del punto).',
    calculationNote: 'Refleja lo cobrado exactamente en cada día del periodo, no el acumulado total.',
    unit: 'currency',
    decimals: '1.2-2',
    tone: 'success',
  },
  mora_ratio: {
    title: 'Mora Ratio',
    description: 'Porcentaje de vencida sobre total',
    formula: 'Formula: (cartera vencida / cartera total pendiente) x 100.',
    calculationNote: 'Compara la presión de mora contra el total pendiente al cierre de cada fecha del rango.',
    unit: 'percent',
    decimals: '1.0-2',
    tone: 'danger',
    inverse: true,
  },
  ier: {
    title: 'IER',
    description: 'Eficiencia de recuperación',
    formula: 'Formula: (recuperado acumulado del periodo / pendiente objetivo con vencimiento en el periodo) x 100.',
    calculationNote: 'Se actualiza día a día acumulando pagos desde el inicio del rango hasta la fecha de corte.',
    unit: 'percent',
    decimals: '1.0-2',
    tone: 'success',
  },
  dso: {
    title: 'DSO',
    description: 'Días de venta pendientes',
    formula: 'Formula: AVG(fecha de corte - due_date) de cuotas vencidas con saldo pendiente.',
    calculationNote: 'Representa el atraso promedio de la cartera vencida vigente en cada fecha del rango.',
    unit: 'days',
    decimals: '1.0-0',
    tone: 'warning',
    inverse: true,
  },
};

export const DASHBOARD_CHART_BASE_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Disable animations for better performance
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 12, weight: 'bold' },
      bodyFont: { size: 11 },
      enabled: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 11 },
        maxTicksLimit: 6, // Limit number of ticks for better performance
      },
    },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: {
        font: { size: 11 },
        maxTicksLimit: 6,
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
};
