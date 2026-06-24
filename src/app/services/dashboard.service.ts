import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponseInterface } from '../interfaces/dashboard.interface';
import { KAPI, KSOCKET } from '../shared/constants';

export interface DashboardDateRangeParams {
  start_date?: string;
  end_date?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}dashboard`;

  getGlobalKpis(params?: DashboardDateRangeParams): Observable<DashboardResponseInterface> {
    return this.http.get<DashboardResponseInterface>(`${this.apiUrl}/global`, {
      params: {
        ...(params?.start_date ? { start_date: params.start_date } : {}),
        ...(params?.end_date ? { end_date: params.end_date } : {}),
      },
    });
  }

  getCollectorKpis(collectorId: string, params?: DashboardDateRangeParams): Observable<DashboardResponseInterface> {
    return this.http.get<DashboardResponseInterface>(`${this.apiUrl}/collector/${collectorId}`, {
      params: {
        ...(params?.start_date ? { start_date: params.start_date } : {}),
        ...(params?.end_date ? { end_date: params.end_date } : {}),
      },
    });
  }
}
