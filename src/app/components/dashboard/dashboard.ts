import { ChangeDetectorRef, Component, OnInit, inject, signal, computed } from '@angular/core';
import { toInputDate, formatDateToDisplay } from '../../shared/utils/date.utils';
import { trackById } from '../../shared/utils/form.utils';
import { finalize } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler, LineController } from 'chart.js';
import {
  DashboardBracketDistributionInterface,
  DashboardHistoryPointInterface,
  DashboardResponseInterface,
} from '../../interfaces/dashboard.interface';
import {
  DashboardChartConfig,
  HistoryMetricKey,
  TrendViewMode,
  TrendTone,
  TrendChartPointViewModel,
  TrendFilterOption,
} from '../../interfaces/dashboard-chart.interface';
import {
  DASHBOARD_CHART_COLORS,
  DASHBOARD_CHART_METRIC_CONFIG,
  DASHBOARD_CHART_BASE_OPTIONS,
} from '../../shared/dictionary/dashboard-chart.dictionary';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { SharedModule } from '../../shared/shared.module';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HoveredTrendPointState {
  trendKey: HistoryMetricKey;
  pointIndex: number;
}

interface TrendCardViewModel {
  key: HistoryMetricKey;
  title: string;
  description: string;
  formula: string;
  calculationNote: string;
  unit: 'currency' | 'percent' | 'days';
  decimals: string;
  tone: TrendTone;
  startValue: number;
  current: number;
  delta: number;
  deltaDirection: 'up' | 'down' | 'flat';
  deltaMeaning: 'positive' | 'negative' | 'neutral';
  startLabel: string;
  midLabel: string;
  endLabel: string;
  minValue: number;
  maxValue: number;
  chartConfig: DashboardChartConfig;
  chartPoints: TrendChartPointViewModel[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly data = signal<DashboardResponseInterface | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly trendViewMode = signal<TrendViewMode>('portfolio_total');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly hoveredTrendPoint = signal<HoveredTrendPointState | null>(null);

  readonly bracketEntries = computed(() => {
    const brackets = this.data()?.brackets;

    if (!brackets) {
      return [];
    }

    const max = Math.max(...brackets.map((bracket) => bracket.count), 1);

    return brackets.map((bracket) => ({
      ...bracket,
      width: `${Math.max((bracket.count / max) * 100, bracket.count > 0 ? 12 : 0)}%`,
    }));
  });

  readonly totalBracketClients = computed(() =>
    this.bracketEntries().reduce((total, bracket) => total + bracket.count, 0)
  );

  readonly historyPoints = computed(() => this.data()?.history?.points ?? []);

  readonly trendCards = computed<TrendCardViewModel[]>(() => {
    const points = this.historyPoints();

    if (points.length === 0) {
      return [];
    }

    const configs = Object.entries(DASHBOARD_CHART_METRIC_CONFIG).map(([key, config]) => ({
      key: key as HistoryMetricKey,
      config,
    }));

    return configs
      .filter(({ key }) => {
        if (key !== 'dso') return true;
        return points.some((point) => Number.isFinite(point.dso));
      })
      .map(({ key, config }) => this.buildTrendCard(key, config));
  });

  readonly trendFilterOptions = computed<TrendFilterOption[]>(() => [
    { key: 'overview', label: 'Tendencias KPI' },
    ...this.trendCards().map((trend) => ({
      key: trend.key,
      label: trend.title,
    })),
  ]);

  readonly selectedTrendCard = computed<TrendCardViewModel | null>(() => {
    const viewMode = this.trendViewMode();

    if (viewMode === 'overview') {
      return null;
    }

    return this.trendCards().find((trend) => trend.key === viewMode) ?? null;
  });

  get userName(): string {
    return this.authService.getUser()?.full_name || 'Usuario';
  }

  get isCollectorView(): boolean {
    const roleName = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return /cobr|collector|gestor/.test(roleName);
  }

  get portfolioTotal(): number {
    return this.data()?.portfolio.total ?? 0;
  }

  get portfolioOverdue(): number {
    return this.data()?.portfolio.overdue ?? 0;
  }

  get recoveredThisMonth(): number {
    return this.data()?.portfolio.recovered_in_period ?? this.data()?.portfolio.recovered_this_month ?? 0;
  }

  get moraRatio(): number {
    return this.data()?.kpis.mora_ratio ?? 0;
  }

  get ier(): number {
    return this.data()?.kpis.ier ?? 0;
  }

  get dso(): number {
    return this.data()?.kpis.dso ?? 0;
  }

  get periodLabel(): string {
    return this.data()?.period?.label ?? '';
  }

  formatTrendValue(card: TrendCardViewModel, value: number): string {
    switch (card.unit) {
      case 'percent':
        return `${value.toLocaleString('es-PE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}%`;
      case 'days':
        return `${value.toLocaleString('es-PE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })} d`;
      default:
        return value.toLocaleString('es-PE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    }
  }

  getTrendDeltaLabel(card: TrendCardViewModel): string {
    const absDelta = Math.abs(card.delta);
    const prefix = card.deltaDirection === 'up'
      ? 'Subio'
      : card.deltaDirection === 'down'
        ? 'Bajo'
        : 'Sin cambio';

    if (card.deltaDirection === 'flat') {
      return `${prefix} en el periodo`;
    }

    return `${prefix} ${this.formatTrendValue(card, absDelta)} vs. ${card.startLabel}`;
  }

  formatTrendPointDate(item: TrendChartPointViewModel): string {
    return formatDateToDisplay(item.date || '') || item.label || '-';
  }

  formatTrendPointDelta(card: TrendCardViewModel, item: TrendChartPointViewModel): string {
    if (item.index === 0) {
      return 'Inicio';
    }

    if (item.direction === 'flat') {
      return 'Sin cambio';
    }

    const sign = item.delta > 0 ? '+' : '-';
    return `${sign}${this.formatTrendValue(card, Math.abs(item.delta))}`;
  }

  getTrendPointDeltaClass(card: TrendCardViewModel, item: TrendChartPointViewModel): string {
    if (item.index === 0 || item.direction === 'flat') {
      return 'delta-neutral';
    }

    return `delta-${this.resolveDeltaMeaning(card.key, item.direction)}`;
  }

  trackByTrendChartPoint(_: number, item: TrendChartPointViewModel): string {
    return `${item.date}-${item.index}`;
  }

  setHoveredTrendPoint(trendKey: HistoryMetricKey, pointIndex: number): void {
    this.hoveredTrendPoint.set({ trendKey, pointIndex });
  }

  clearHoveredTrendPoint(trendKey?: HistoryMetricKey): void {
    const hovered = this.hoveredTrendPoint();

    if (!hovered) {
      return;
    }

    if (trendKey && hovered.trendKey !== trendKey) {
      return;
    }

    this.hoveredTrendPoint.set(null);
  }

  getHoveredTrendPoint(trend: TrendCardViewModel): TrendChartPointViewModel | null {
    const hovered = this.hoveredTrendPoint();

    if (!hovered || hovered.trendKey !== trend.key) {
      return null;
    }

    return trend.chartPoints.find((point) => point.index === hovered.pointIndex) ?? null;
  }

  isHoveredTrendPoint(trend: TrendCardViewModel, pointIndex: number): boolean {
    const hovered = this.hoveredTrendPoint();
    return hovered?.trendKey === trend.key && hovered.pointIndex === pointIndex;
  }

  setTrendViewMode(mode: TrendViewMode): void {
    this.trendViewMode.set(mode);
  }

  isTrendViewMode(mode: TrendViewMode): boolean {
    return this.trendViewMode() === mode;
  }

  getBracketBarStyle(bracket: DashboardBracketDistributionInterface & { width: string }): Record<string, string> {
    return {
      width: bracket.width,
      background: bracket.color
        ? `linear-gradient(90deg, ${bracket.color}, ${bracket.color}CC)`
        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    };
  }

  ngOnInit(): void {
    this.initializeDateRange();
    this.loadDashboard();
  }

  reload(): void {
    this.loadDashboard();
  }

  applyDateFilter(): void {
    if (!this.startDate() || !this.endDate()) {
      this.error.set('Debes seleccionar una fecha inicio y una fecha fin.');
      return;
    }

    if (this.startDate() > this.endDate()) {
      this.error.set('La fecha inicio no puede ser mayor que la fecha fin.');
      return;
    }

    this.loadDashboard();
  }

  resetDateFilter(): void {
    this.initializeDateRange();
    this.loadDashboard();
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
  }

  private loadDashboard(): void {
    const user = this.authService.getUser();

    this.loading.set(true);
    this.error.set(null);

    const params = {
      start_date: this.startDate(),
      end_date: this.endDate(),
    };

    const request$ = this.isCollectorView && user?.id
      ? this.dashboardService.getCollectorKpis(user.id, params)
      : this.dashboardService.getGlobalKpis(params);

    request$
      .pipe(finalize(() => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.data.set(response);
          this.trendViewMode.set('portfolio_total');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'No se pudo cargar el dashboard.');
          this.cdr.markForCheck();
        },
      });
  }

  private buildTrendCard(
    key: HistoryMetricKey,
    config: typeof DASHBOARD_CHART_METRIC_CONFIG[HistoryMetricKey]
  ): TrendCardViewModel {
    const points = this.historyPoints();
    const values = points.map((point) => this.getMetricValue(point, key));
    const chartPoints = points.map((point, index) => {
      const value = this.getMetricValue(point, key);
      const previousValue = index > 0 ? this.getMetricValue(points[index - 1], key) : value;
      const delta = value - previousValue;

      return {
        index,
        date: point.date,
        label: point.label,
        value,
        delta,
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      } satisfies TrendChartPointViewModel;
    });
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const delta = last - first;
    const deltaDirection: TrendCardViewModel['deltaDirection'] =
      delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const deltaMeaning = this.resolveDeltaMeaning(key, deltaDirection);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const colors = DASHBOARD_CHART_COLORS[config.tone];

    return {
      key,
      title: config.title,
      description: config.description,
      formula: config.formula,
      calculationNote: config.calculationNote,
      unit: config.unit,
      decimals: config.decimals,
      tone: config.tone,
      startValue: first,
      current: last,
      delta,
      deltaDirection,
      deltaMeaning,
      startLabel: points[0]?.label ?? '',
      midLabel: points[Math.floor((points.length - 1) / 2)]?.label ?? '',
      endLabel: points[points.length - 1]?.label ?? '',
      minValue,
      maxValue,
      chartConfig: this.buildChartConfig(values, points, colors, config.title),
      chartPoints,
    };
  }

  private buildChartConfig(
    values: number[],
    points: DashboardHistoryPointInterface[],
    colors: typeof DASHBOARD_CHART_COLORS[keyof typeof DASHBOARD_CHART_COLORS],
    label: string
  ): DashboardChartConfig {
    const data: ChartConfiguration<'line'>['data'] = {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: values,
          label,
          borderColor: colors.line,
          backgroundColor: colors.fill,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.line,
        },
      ],
    };

    return {
      type: 'line' as ChartType,
      data,
      options: DASHBOARD_CHART_BASE_OPTIONS,
    };
  }

  private getMetricValue(point: DashboardHistoryPointInterface, key: HistoryMetricKey): number {
    return point[key] ?? 0;
  }

  private resolveDeltaMeaning(
    key: HistoryMetricKey,
    direction: TrendCardViewModel['deltaDirection']
  ): TrendCardViewModel['deltaMeaning'] {
    if (direction === 'flat') {
      return 'neutral';
    }

    const config = DASHBOARD_CHART_METRIC_CONFIG[key];
    const isGood = config.inverse ? direction === 'down' : direction === 'up';

    return isGood ? 'positive' : 'negative';
  }

  private initializeDateRange(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    this.startDate.set(toInputDate(start));
    this.endDate.set(toInputDate(end));
  }
}
