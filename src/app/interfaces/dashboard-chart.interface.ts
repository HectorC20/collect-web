import { ChartConfiguration, ChartType } from 'chart.js';

export interface DashboardChartConfig {
  type: ChartType;
  data: ChartConfiguration['data'];
  options: ChartConfiguration['options'];
}

export type HistoryMetricKey =
  | 'portfolio_total'
  | 'portfolio_overdue'
  | 'recovered'
  | 'mora_ratio'
  | 'ier'
  | 'dso';

export type TrendViewMode = 'overview' | HistoryMetricKey;

export type TrendTone = 'primary' | 'danger' | 'success' | 'warning' | 'slate';

export interface TrendChartPointViewModel {
  index: number;
  date: string;
  label: string;
  value: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

export interface TrendFilterOption {
  key: TrendViewMode;
  label: string;
}
