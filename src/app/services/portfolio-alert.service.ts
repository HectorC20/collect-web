import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import {
  PortfolioAlertFiltersInterface,
  PortfolioAlertListResponseInterface,
  PortfolioAlertSummaryInterface,
} from '../interfaces/portfolio-alert.interface';

interface PortfolioAlertSummaryResponse {
  data: PortfolioAlertSummaryInterface;
}

interface PortfolioAlertListApiResponse {
  data: PortfolioAlertListResponseInterface;
}

@Injectable({ providedIn: 'root' })
export class PortfolioAlertService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}portfolio/alerts`;

  getSummary(filters: PortfolioAlertFiltersInterface = {}): Observable<PortfolioAlertSummaryInterface> {
    return this.http
      .get<PortfolioAlertSummaryResponse>(`${this.apiUrl}/summary`, {
        params: this.buildParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  getAlerts(filters: PortfolioAlertFiltersInterface = {}): Observable<PortfolioAlertListResponseInterface> {
    return this.http
      .get<PortfolioAlertListApiResponse>(this.apiUrl, {
        params: this.buildParams(filters),
      })
      .pipe(map((response) => response.data));
  }

  private buildParams(filters: PortfolioAlertFiltersInterface): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        params = params.set(key, String(value).trim());
      }
    });

    return params;
  }
}
