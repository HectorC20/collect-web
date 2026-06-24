import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivityReportPreviewRow,
  GeneralReportPreviewRow,
  PortfolioReportPreviewRow,
  ReportExportResult,
  ReportFilters,
  ReportService,
} from '../../services/report.service';

const DEFAULT_FILTERS: Required<ReportFilters> = {
  search: '',
  name: '',
  dni: '',
  block: '',
  lot: '',
  clientStatus: '',
  lotStatus: '',
  dateFrom: '',
  dateTo: '',
};

@Injectable()
export class ReportStateService {
  private readonly reportService = inject(ReportService);
  private readonly destroyRef = inject(DestroyRef);
  private allowedRoutes = new Set<string>();

  readonly filters = signal<ReportFilters>({ ...DEFAULT_FILTERS });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly generalRows = signal<GeneralReportPreviewRow[]>([]);
  readonly generalTotal = signal(0);
  readonly portfolioRows = signal<PortfolioReportPreviewRow[]>([]);
  readonly portfolioTotal = signal(0);
  readonly activityRows = signal<ActivityReportPreviewRow[]>([]);
  readonly activityTotal = signal(0);

  setPermissions(routes: string[]): void {
    this.allowedRoutes = new Set(routes);
  }

  applyFilters(filters: ReportFilters): void {
    const normalized = { ...DEFAULT_FILTERS, ...filters };
    this.filters.set(normalized);
    this.loadPreviews();
  }

  resetFilters(): void {
    this.applyFilters({ ...DEFAULT_FILTERS });
  }

  loadPreviews(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      general: this.loadGeneralPreview(),
      portfolio: this.loadPortfolioPreview(),
      activity: this.loadActivityPreview(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ general, portfolio, activity }) => {
          this.generalRows.set(general.rows);
          this.generalTotal.set(general.total);
          this.portfolioRows.set(portfolio.rows);
          this.portfolioTotal.set(portfolio.total);
          this.activityRows.set(activity.rows);
          this.activityTotal.set(activity.total);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error?.error?.message ?? 'No se pudieron cargar las vistas previas de reportes.');
          this.loading.set(false);
        },
      });
  }

  exportGeneral(): ReturnType<ReportService['exportGeneralData']> {
    return this.reportService.exportGeneralData(this.filters());
  }

  exportPortfolio(): ReturnType<ReportService['exportPortfolioData']> {
    return this.reportService.exportPortfolioData(this.filters());
  }

  exportActivity(): ReturnType<ReportService['exportRecentActivityData']> {
    return this.reportService.exportRecentActivityData(this.filters());
  }

  download(result: ReportExportResult): void {
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private loadGeneralPreview() {
    if (!this.allowedRoutes.has('/reports/general')) {
      return of(this.emptyPreview<GeneralReportPreviewRow>());
    }

    return this.reportService.getGeneralPreview(this.filters()).pipe(
      catchError((error) => this.handlePreviewError<GeneralReportPreviewRow>(error))
    );
  }

  private loadPortfolioPreview() {
    if (!this.allowedRoutes.has('/reports/portfolio')) {
      return of(this.emptyPreview<PortfolioReportPreviewRow>());
    }

    return this.reportService.getPortfolioPreview(this.filters()).pipe(
      catchError((error) => this.handlePreviewError<PortfolioReportPreviewRow>(error))
    );
  }

  private loadActivityPreview() {
    if (!this.allowedRoutes.has('/reports/activity')) {
      return of(this.emptyPreview<ActivityReportPreviewRow>());
    }

    return this.reportService.getActivityPreview(this.filters()).pipe(
      catchError((error) => this.handlePreviewError<ActivityReportPreviewRow>(error))
    );
  }

  private emptyPreview<T>() {
    return {
      rows: [] as T[],
      total: 0,
    };
  }

  private handlePreviewError<T>(error: unknown) {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      return of(this.emptyPreview<T>());
    }

    return throwError(() => error);
  }
}
