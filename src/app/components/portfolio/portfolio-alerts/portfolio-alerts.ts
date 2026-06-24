import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, finalize, forkJoin } from 'rxjs';
import { PortfolioAlertService } from '../../../services/portfolio-alert.service';
import { PortfolioAlertRealtimeService } from '../../../services/portfolio-alert-realtime.service';
import {
  PortfolioAlertItemInterface,
  PortfolioAlertFiltersInterface,
  PortfolioAlertSeverity,
  PortfolioAlertSummaryInterface,
} from '../../../interfaces/portfolio-alert.interface';
import { PORTFOLIO_ALERT_SEVERITY_LABELS } from '../../../shared/dictionary/portfolio-alert.dictionary';
import { SharedModule } from '../../../shared/shared.module';

@Component({
  selector: 'app-portfolio-alerts',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './portfolio-alerts.html',
  styleUrl: './portfolio-alerts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioAlertsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() fixedAssignedUserId: string | null = null;
  @Input() contextReady = true;
  @Input() contextEmptyMessage = 'Selecciona una cartera para visualizar alertas.';
  @Input() walletFilters: PortfolioAlertFiltersInterface | null = null;
  @Output() readonly viewClient = new EventEmitter<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly portfolioAlertService = inject(PortfolioAlertService);
  private readonly portfolioAlertRealtimeService = inject(PortfolioAlertRealtimeService);
  private readonly realtimeRefresh$ = new Subject<void>();
  private currentFiltersKey: string | null = null;
  private currentCollectorRoomUserId: string | null = null;
  private requestInFlight = false;
  private queuedReload = false;

  summary: PortfolioAlertSummaryInterface | null = null;
  alerts: PortfolioAlertItemInterface[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.bindRealtimeRefresh();
    this.bindRealtimeEvents();
    this.syncAlertState(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fixedAssignedUserId'] || changes['contextReady'] || changes['walletFilters']) {
      this.syncAlertState();
    }
  }

  ngOnDestroy(): void {
    this.portfolioAlertRealtimeService.leaveRoom();
  }

  get severityOptions(): Array<{ value: PortfolioAlertSeverity; label: string }> {
    return (Object.entries(PORTFOLIO_ALERT_SEVERITY_LABELS) as Array<[PortfolioAlertSeverity, string]>)
      .map(([value, label]) => ({ value, label }));
  }

  openClient(clientId: string): void {
    this.viewClient.emit(clientId);
  }

  trackByAlert(_: number, item: PortfolioAlertItemInterface): string {
    return item.id;
  }

  getSeverityLabel(severity: PortfolioAlertSeverity): string {
    return this.severityOptions.find((option) => option.value === severity)?.label ?? severity;
  }

  getSeverityClass(severity: PortfolioAlertSeverity): string {
    return `severity-${severity}`;
  }

  private bindRealtimeRefresh(): void {
    this.realtimeRefresh$
      .pipe(
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadComponentData(true));
  }

  private bindRealtimeEvents(): void {
    this.portfolioAlertRealtimeService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const activeCollectorUserId = this.buildFilters().assignedUserId?.trim() ?? null;

        if (!activeCollectorUserId || event.payload.collector_user_id !== activeCollectorUserId) {
          return;
        }

        this.realtimeRefresh$.next();
      });
  }

  private syncAlertState(forceReload = false): void {
    if (!this.contextReady) {
      this.currentFiltersKey = null;
      this.currentCollectorRoomUserId = null;
      this.portfolioAlertRealtimeService.leaveRoom();
      this.summary = null;
      this.alerts = [];
      this.loading = false;
      this.error = null;
      this.cdr.markForCheck();
      return;
    }

    const filters = this.buildFilters();
    const nextCollectorUserId = filters.assignedUserId?.trim() ?? null;
    const nextFiltersKey = this.buildFiltersKey(filters);

    if (nextCollectorUserId !== this.currentCollectorRoomUserId) {
      this.currentCollectorRoomUserId = nextCollectorUserId;

      if (nextCollectorUserId) {
        void this.portfolioAlertRealtimeService.openCollectorRoom(nextCollectorUserId).catch(() => {
          // El componente sigue operando por HTTP aunque la sala falle.
        });
      } else {
        this.portfolioAlertRealtimeService.leaveRoom();
      }
    }

    if (forceReload || this.currentFiltersKey !== nextFiltersKey) {
      this.currentFiltersKey = nextFiltersKey;
      this.loadComponentData(false);
    }
  }

  private loadComponentData(silentRefresh = false): void {
    if (!this.contextReady) {
      this.summary = null;
      this.alerts = [];
      this.loading = false;
      this.error = null;
      this.cdr.markForCheck();
      return;
    }

    if (this.requestInFlight) {
      this.queuedReload = true;
      return;
    }

    this.requestInFlight = true;
    this.queuedReload = false;

    if (!silentRefresh) {
      this.loading = true;
    }

    this.error = null;
    const filters = this.buildFilters();

    forkJoin({
      summary: this.portfolioAlertService.getSummary(filters),
      alerts: this.portfolioAlertService.getAlerts(filters),
    })
      .pipe(finalize(() => {
        this.requestInFlight = false;
        this.loading = false;
        this.cdr.markForCheck();

        if (this.queuedReload) {
          this.queuedReload = false;
          this.loadComponentData(true);
        }
      }))
      .subscribe({
        next: ({ summary, alerts }) => {
          this.summary = summary;
          this.alerts = alerts.items ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = this.extractErrorMessage(err, 'No se pudieron cargar las alertas de cartera.');
          this.cdr.markForCheck();
        },
      });
  }

  private buildFilters(): PortfolioAlertFiltersInterface {
    return {
      ...(this.walletFilters ?? {}),
      assignedUserId: this.fixedAssignedUserId ?? this.walletFilters?.assignedUserId ?? null,
    };
  }

  private buildFiltersKey(filters: PortfolioAlertFiltersInterface): string {
    return JSON.stringify(
      Object.entries(filters)
        .sort(([left], [right]) => left.localeCompare(right))
    );
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'error' in error && error.error && typeof error.error === 'object') {
      const apiError = error.error as { message?: string };
      if (typeof apiError.message === 'string' && apiError.message.trim() !== '') {
        return apiError.message;
      }
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim() !== '') {
      return error.message;
    }

    return fallback;
  }
}
