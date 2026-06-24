import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import {
  PortfolioClientActionHistoryInterface,
  PortfolioClientActionTypeInterface,
  PortfolioClientInterface,
  PortfolioPendingImportResponseInterface,
  PortfolioQuickSearchResultInterface,
  CollectorUserInterface,
  UpdatePortfolioInstallmentPaymentPayload,
} from '../interfaces/portfolio.interface';
import { AuthService } from './auth.service';

interface PortfolioResponse {
  data: PortfolioClientInterface[];
}

interface PortfolioQuickSearchResponse {
  data: PortfolioQuickSearchResultInterface[];
}

interface PortfolioClientActionResponse {
  data: PortfolioClientInterface;
  message?: string;
}

interface PortfolioActionCatalogResponse {
  data: PortfolioClientActionTypeInterface[];
}

interface PortfolioActionHistoryResponse {
  data: PortfolioClientActionHistoryInterface[];
  message?: string;
}

interface PortfolioActionRegisterResponse {
  data: PortfolioClientActionHistoryInterface;
  message?: string;
}

interface PortfolioPendingImportResponse {
  data: PortfolioPendingImportResponseInterface;
  message?: string;
}

interface CollectorsResponse {
  data: CollectorUserInterface[];
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly authUrlCollectors = '/users/collectors';
  private readonly urlClients = '/clients';
  private readonly urlWallet = '/wallet';
  private readonly urlAssignWallet = '/wallet/assign';
  private readonly urlActionCatalog = '/wallet/actions/catalog';
  private readonly urlActionHistory = '/wallet/actions/history';
  private readonly urlActionRegister = '/wallet/actions/register';
  private readonly urlPendingImportUpdates = '/wallet/pending-updates';
  private readonly urlApprovePendingImportUpdates = '/wallet/pending-updates/approve';
  private readonly urlRejectPendingImportUpdates = '/wallet/pending-updates/reject';
  private readonly urlUpdatePersonal = '/clients/update-personal';
  private readonly urlPortfolio = 'portfolio';
  private readonly urlAuth = 'auth';
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${KSOCKET}${KAPI}${this.urlPortfolio}`;
  private readonly authApiUrl = `${KSOCKET}${KAPI}${this.urlAuth}`;

  getAll(assignedUserId?: string | null): Observable<PortfolioClientInterface[]> {
    const token = this.requireToken();
    const payload: { token: string; assignedUserId?: string } = { token };

    if (assignedUserId) {
      payload.assignedUserId = assignedUserId;
    }

    return this.http
      .post<PortfolioResponse>(`${this.apiUrl}${this.urlClients}`, payload)
      .pipe(map((response) => response.data ?? []));
  }

  getCollectorWallet(): Observable<PortfolioClientInterface[]> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioResponse>(`${this.apiUrl}${this.urlWallet}`, { token })
      .pipe(map((response) => response.data ?? []));
  }

  quickSearch(search: string): Observable<PortfolioQuickSearchResultInterface[]> {
    return this.http
      .get<PortfolioQuickSearchResponse>(`${this.apiUrl}${this.urlClients}/quick-search`, {
        params: { search },
      })
      .pipe(map((response) => response.data ?? []));
  }

  assignToMyWallet(
    clientId: string,
    options?: {
      bracketId?: string | null;
      bracketMode?: 'manual' | 'automatic';
    }
  ): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}${this.urlAssignWallet}`, {
        token,
        clientId,
        bracketId: options?.bracketId || null,
        bracketMode: options?.bracketMode || 'automatic',
      })
      .pipe(map((response) => response.data));
  }

  getActionCatalog(): Observable<PortfolioClientActionTypeInterface[]> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioActionCatalogResponse>(`${this.apiUrl}${this.urlActionCatalog}`, { token })
      .pipe(map((response) => response.data ?? []));
  }

  getClientActionHistory(clientId: string): Observable<PortfolioClientActionHistoryInterface[]> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioActionHistoryResponse>(`${this.apiUrl}${this.urlActionHistory}`, { token, clientId })
      .pipe(map((response) => response.data ?? []));
  }

  registerClientAction(payload: {
    clientId: string;
    actionTypeId: string;
    observation?: string | null;
    actionDate?: string | null;
  }): Observable<PortfolioClientActionHistoryInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioActionRegisterResponse>(`${this.apiUrl}${this.urlActionRegister}`, {
        token,
        ...payload,
      })
      .pipe(map((response) => response.data));
  }

  updateClientPersonalData(payload: {
    clientId: string;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    district?: string | null;
    province?: string | null;
    department?: string | null;
    dni?: string | null;
  }): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}${this.urlUpdatePersonal}`, {
        token,
        ...payload,
      })
      .pipe(map((response) => response.data));
  }

  updateClientBracket(payload: {
    clientId: string;
    bracketMode: 'manual' | 'automatic';
    bracketId?: string | null;
  }): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}/clients/update-bracket`, {
        token,
        ...payload,
      })
      .pipe(map((response) => response.data));
  }

  updateInstallmentPayment(payload: UpdatePortfolioInstallmentPaymentPayload): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}/installments/update-payment`, {
        token,
        ...payload,
      })
      .pipe(map((response) => response.data));
  }

  getPendingImportUpdates(clientId: string): Observable<PortfolioPendingImportResponseInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioPendingImportResponse>(`${this.apiUrl}${this.urlPendingImportUpdates}`, { token, clientId })
      .pipe(
        map((response) => response.data ?? { clientId, summary: { generalCount: 0, scheduleCount: 0, totalCount: 0 }, items: [] })
      );
  }

  approvePendingImportUpdates(clientId: string): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}${this.urlApprovePendingImportUpdates}`, { token, clientId })
      .pipe(map((response) => response.data));
  }

  rejectPendingImportUpdates(clientId: string): Observable<PortfolioClientInterface> {
    const token = this.requireToken();

    return this.http
      .post<PortfolioClientActionResponse>(`${this.apiUrl}${this.urlRejectPendingImportUpdates}`, { token, clientId })
      .pipe(map((response) => response.data));
  }

  getCollectors(): Observable<CollectorUserInterface[]> {
        const token = this.requireToken();

        return this.http
            .get<CollectorsResponse>(`${this.authApiUrl}/users/collectors`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .pipe(map((response) => response.data ?? []));
    }

    unassignClientFromCollector(clientId: string): Observable<PortfolioClientInterface> {
        const token = this.requireToken();

        return this.http
            .post<PortfolioClientActionResponse>(`${this.apiUrl}/wallet/unassign`, {
                token,
                clientId,
            })
            .pipe(map((response) => response.data));
    }

  private requireToken(): string {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error('No se encontró el token de autenticación.');
    }

    return token;
  }
}
