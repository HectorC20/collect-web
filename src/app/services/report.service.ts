import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';

export interface ReportExportResult {
  blob: Blob;
  fileName: string;
  totalRecords: number;
}

export interface ReportFilters {
  search?: string | null;
  name?: string | null;
  dni?: string | null;
  block?: string | null;
  lot?: string | null;
  clientStatus?: string | null;
  lotStatus?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface GeneralReportPreviewRow {
  id: string;
  fullName: string | null;
  dni: string | null;
  clientStatus: string | null;
  lotStatus: string | null;
  saleType: string | null;
  block: string | null;
  lot: string | null;
  lotCode: string | null;
  contractCode: string | null;
  assignedUserName: string | null;
}

export interface PortfolioReportPreviewRow {
  id: string;
  collectorName: string | null;
  roleName: string | null;
  email: string | null;
  phone: string | null;
  clientsCount: number;
  contractsCount: number;
  portfolioAccessScope: string | null;
}

export interface ActivityReportPreviewRow {
  id: string;
  actionDate: string | null;
  actionName: string | null;
  observation: string | null;
  clientName: string | null;
  dni: string | null;
  collectorName: string | null;
  lot: string | null;
  clientStatus: string | null;
  lotStatus: string | null;
  registeredBy: string | null;
}

export interface ReportPreviewResponse<T> {
  rows: T[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}reports`;

  exportGeneralData(filters: ReportFilters = {}): Observable<ReportExportResult> {
    return this.http
      .get(`${this.apiUrl}/general/export`, {
        observe: 'response',
        responseType: 'blob',
        params: this.buildParams(filters),
      })
      .pipe(map((response: HttpResponse<Blob>) => ({
        blob: response.body ?? new Blob(),
        fileName: this.extractFileName(response) ?? 'general-report.xlsx',
        totalRecords: Number(response.headers.get('X-Export-Total-Records') ?? '0'),
      })));
  }

  exportPortfolioData(filters: ReportFilters = {}): Observable<ReportExportResult> {
    return this.http
      .get(`${this.apiUrl}/portfolio/export`, {
        observe: 'response',
        responseType: 'blob',
        params: this.buildParams(filters),
      })
      .pipe(map((response: HttpResponse<Blob>) => ({
        blob: response.body ?? new Blob(),
        fileName: this.extractFileName(response) ?? 'portfolio-report.xlsx',
        totalRecords: Number(response.headers.get('X-Export-Total-Records') ?? '0'),
      })));
  }

  exportRecentActivityData(filters: ReportFilters = {}): Observable<ReportExportResult> {
    return this.http
      .get(`${this.apiUrl}/activity/export`, {
        observe: 'response',
        responseType: 'blob',
        params: this.buildParams(filters),
      })
      .pipe(map((response: HttpResponse<Blob>) => ({
        blob: response.body ?? new Blob(),
        fileName: this.extractFileName(response) ?? 'recent-activity-report.xlsx',
        totalRecords: Number(response.headers.get('X-Export-Total-Records') ?? '0'),
      })));
  }

  getGeneralPreview(filters: ReportFilters = {}): Observable<ReportPreviewResponse<GeneralReportPreviewRow>> {
    return this.http
      .get<{ data: ReportPreviewResponse<GeneralReportPreviewRow> }>(`${this.apiUrl}/general/preview`, {
        params: this.buildParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getPortfolioPreview(filters: ReportFilters = {}): Observable<ReportPreviewResponse<PortfolioReportPreviewRow>> {
    return this.http
      .get<{ data: ReportPreviewResponse<PortfolioReportPreviewRow> }>(`${this.apiUrl}/portfolio/preview`, {
        params: this.buildParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getActivityPreview(filters: ReportFilters = {}): Observable<ReportPreviewResponse<ActivityReportPreviewRow>> {
    return this.http
      .get<{ data: ReportPreviewResponse<ActivityReportPreviewRow> }>(`${this.apiUrl}/activity/preview`, {
        params: this.buildParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  private extractFileName(response: HttpResponse<Blob>): string | null {
    const contentDisposition = response.headers.get('Content-Disposition');

    if (!contentDisposition) {
      return response.headers.get('X-Export-File-Name');
    }

    const match = contentDisposition.match(/filename="?([^"]+)"?/i);

    return match?.[1] ?? response.headers.get('X-Export-File-Name');
  }

  private buildParams(filters: ReportFilters): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        params = params.set(key, String(value).trim());
      }
    });

    return params;
  }
}
