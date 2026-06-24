import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import { AuthService } from './auth.service';
import {
  UpsertWhatsappSessionPayload,
  WhatsappChatView,
  WhatsappMessageHistoryView,
  WhatsappMessageView,
  WhatsappOverviewView,
  WhatsappSendMessageResponse,
  WhatsappSessionView,
} from '../interfaces/whatsappconversation.interface';

interface ItemResponse<T> {
  data: T;
  message?: string;
}

interface CollectionResponse<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${KSOCKET}${KAPI}messaging/whatsapp`;

  getOverview(sessionId?: string | null, chatId?: string | null): Observable<WhatsappOverviewView> {
    let params = new HttpParams();

    if (sessionId) {
      params = params.set('session_id', sessionId);
    }

    if (chatId) {
      params = params.set('chat_id', chatId);
    }

    return this.http
      .get<ItemResponse<WhatsappOverviewView>>(`${this.apiUrl}/overview`, {
        headers: this.authHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  getSessions(): Observable<WhatsappSessionView[]> {
    return this.http
      .get<CollectionResponse<WhatsappSessionView>>(`${this.apiUrl}/sessions`, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data ?? []));
  }

  getChats(sessionId: string): Observable<WhatsappChatView[]> {
    return this.http
      .get<CollectionResponse<WhatsappChatView>>(`${this.apiUrl}/sessions/${sessionId}/chats`, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data ?? []));
  }

  getMessages(sessionId: string, chatId: string): Observable<WhatsappMessageView[]> {
    return this.http
      .get<CollectionResponse<WhatsappMessageView>>(`${this.apiUrl}/sessions/${sessionId}/chats/${chatId}/messages`, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data ?? []));
  }

  getMessageHistory(
    sessionId: string,
    options: {
      chatId?: string | null;
      from?: string | null;
      to?: string | null;
      limit?: number | null;
    } = {}
  ): Observable<WhatsappMessageHistoryView> {
    let params = new HttpParams();

    if (options.chatId) {
      params = params.set('chat_id', options.chatId);
    }

    if (options.from) {
      params = params.set('from', options.from);
    }

    if (options.to) {
      params = params.set('to', options.to);
    }

    if (typeof options.limit === 'number' && Number.isFinite(options.limit)) {
      params = params.set('limit', String(options.limit));
    }

    return this.http
      .get<ItemResponse<WhatsappMessageHistoryView>>(`${this.apiUrl}/sessions/${sessionId}/messages/history`, {
        headers: this.authHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  createSession(payload: UpsertWhatsappSessionPayload): Observable<WhatsappSessionView> {
    return this.http
      .post<ItemResponse<WhatsappSessionView>>(`${this.apiUrl}/sessions`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateSession(sessionId: string, payload: UpsertWhatsappSessionPayload): Observable<WhatsappSessionView> {
    return this.http
      .put<ItemResponse<WhatsappSessionView>>(`${this.apiUrl}/sessions/${sessionId}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  connectSession(sessionId: string): Observable<WhatsappSessionView> {
    return this.http
      .post<ItemResponse<WhatsappSessionView>>(`${this.apiUrl}/sessions/${sessionId}/connect`, {}, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  disconnectSession(sessionId: string): Observable<WhatsappSessionView> {
    return this.http
      .post<ItemResponse<WhatsappSessionView>>(`${this.apiUrl}/sessions/${sessionId}/disconnect`, {}, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/sessions/${sessionId}`, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }

  sendMessage(sessionId: string, chatId: string, text: string): Observable<WhatsappSendMessageResponse> {
    return this.http
      .post<WhatsappSendMessageResponse>(`${this.apiUrl}/sessions/${sessionId}/chats/${chatId}/messages`, { text }, {
        headers: this.authHeaders(),
      });
  }

  sendMessageToClient(sessionId: string, clientId: string, text: string): Observable<WhatsappSendMessageResponse> {
    return this.http
      .post<WhatsappSendMessageResponse>(`${this.apiUrl}/sessions/${sessionId}/clients/${clientId}/messages`, { text }, {
        headers: this.authHeaders(),
      });
  }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error('No se encontró el token de autenticación.');
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
