import { Injectable, inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, map, of, throwError, tap } from 'rxjs';
import { KSOCKETHTTP, KAPI } from '../shared/constants';
import { AuthResponseModel } from '../models/auth-response.model';
import { UserModel } from '../models/user.model';
import { WebsocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private request = inject(REQUEST, { optional: true });
  private websocketService = inject(WebsocketService);
  private readonly urlAuth= 'auth';
  private readonly apiUrl = `${KSOCKETHTTP}${KAPI}${this.urlAuth}`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly TOKEN_COOKIE = 'auth_token';

  constructor() {
    this.syncSessionToken();
    this.restoreRealtimeConnection();
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponseModel> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      map(resp => AuthResponseModel.fromJson(resp)),
      tap(auth => this.saveSession(auth)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return of(
            AuthResponseModel.unauthorized(
              error.error?.message || 'Credenciales inválidas.'
            )
          );
        }

        return throwError(() => error);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      map(resp => ({
        message: resp.message,
        user: UserModel.fromJson(resp.data)
      }))
    );
  }

  logout(): void {
    this.websocketService.disconnect();

    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      document.cookie = `${this.TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(this.TOKEN_KEY) ?? this.getCookieValue(document.cookie, this.TOKEN_COOKIE);
    }
    const cookieHeader = this.request?.headers.get('cookie') ?? '';
    return this.getCookieValue(cookieHeader, this.TOKEN_COOKIE);
  }

  getUser(): UserModel | null {
    if (this.isBrowser) {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? UserModel.fromJson(JSON.parse(userJson)) : null;
    }
    return null;
  }

  restoreRealtimeConnection(): void {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user?.id) {
      return;
    }

    void this.websocketService.connectSession({
      token,
      userId: user.id,
    }).catch(() => undefined);
  }

  private saveSession(auth: AuthResponseModel): void {
    if (!this.isBrowser) return;

    if (auth.token) {
      localStorage.setItem(this.TOKEN_KEY, auth.token);
      document.cookie = `${this.TOKEN_COOKIE}=${encodeURIComponent(auth.token)}; path=/; max-age=2592000; SameSite=Lax`;
    }
    if (auth.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(auth.user.toJson()));
    }

    if (auth.token && auth.user?.id) {
      void this.websocketService.connectSession({
        token: auth.token,
        userId: auth.user.id,
      }).catch(() => undefined);
    }
  }

  private syncSessionToken(): void {
    if (!this.isBrowser) return;

    const storageToken = localStorage.getItem(this.TOKEN_KEY);
    const cookieToken = this.getCookieValue(document.cookie, this.TOKEN_COOKIE);

    if (storageToken && storageToken !== cookieToken) {
      document.cookie = `${this.TOKEN_COOKIE}=${encodeURIComponent(storageToken)}; path=/; max-age=2592000; SameSite=Lax`;
      return;
    }

    if (!storageToken && cookieToken) {
      localStorage.setItem(this.TOKEN_KEY, cookieToken);
    }
  }

  private getCookieValue(cookieHeader: string, name: string): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';');
    const prefix = `${name}=`;
    for (const part of cookies) {
      const cookie = part.trim();
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.substring(prefix.length));
      }
    }

    return null;
  }
}
