export interface DashboardPortfolioInterface {
  total: number;
  overdue: number;
  recovered_this_month: number;
  recovered_in_period?: number;
}

export interface DashboardKpisInterface {
  mora_ratio: number;
  ier: number;
  dso?: number;
}

export interface DashboardHistoryPointInterface {
  date: string;
  label: string;
  portfolio_total: number;
  portfolio_overdue: number;
  recovered: number;
  mora_ratio: number;
  ier: number;
  dso: number;
}

export interface DashboardHistoryInterface {
  points: DashboardHistoryPointInterface[];
}

export interface DashboardBracketDistributionInterface {
  id: string;
  name: string;
  color: string | null;
  min_days: number | null;
  max_days: number | null;
  is_default: boolean;
  count: number;
  range_label: string;
}

export interface DashboardResponseInterface {
  portfolio: DashboardPortfolioInterface;
  kpis: DashboardKpisInterface;
  period?: {
    start_date: string;
    end_date: string;
    days: number;
    label: string;
  };
  history?: DashboardHistoryInterface;
  brackets?: DashboardBracketDistributionInterface[];
}
