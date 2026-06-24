import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import Echo from 'laravel-echo';
import Pusher, { Channel } from 'pusher-js';
import { websocketRoom } from '../room/websocket-room';
import { KSOCKETHTTP, KSOCKETWS, REVERB_CONFIG } from '../shared/constants';

export interface RealtimeSessionConfig {
  token: string;
  userId: string;
}

export interface RealtimeRoomMessage {
  room: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private echo: Echo<'reverb'> | null = null;
  private pusher: Pusher | null = null;
  private currentToken: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private readonly roomSubscriptions = new Map<string, Channel>();

  readonly connected$ = new BehaviorSubject<boolean>(false);
  readonly messages$ = new Subject<unknown>();
  readonly roomMessages$ = new Subject<RealtimeRoomMessage>();

  connectSession(config: RealtimeSessionConfig): Promise<void> {
    const token = config.token.trim();
    const userId = config.userId.trim();

    if (!this.isBrowser || !token || !userId) {
      this.disconnect();
      return Promise.reject(new Error('No se pudo inicializar la conexion en tiempo real.'));
    }

    return this.ensureConnection(token).then(() => this.joinRoom(websocketRoom.generalUser(userId)));
  }

  joinRoom(room: string): Promise<void> {
    const normalizedRoom = room.trim();

    if (!this.isBrowser || normalizedRoom === '' || !this.echo || !this.currentToken) {
      return Promise.reject(new Error('No se pudo suscribir la sala WebSocket.'));
    }

    if (this.roomSubscriptions.has(normalizedRoom)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const subscription = this.echo!.private(normalizedRoom);
      const timeoutId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          this.leaveRoom(normalizedRoom);
          reject(new Error(`Tiempo de espera agotado al suscribirse a la sala ${normalizedRoom}.`));
        }
      }, 8000);

      subscription.subscribed(() => {
        this.roomSubscriptions.set(normalizedRoom, subscription.subscription);
        window.clearTimeout(timeoutId);

        if (!settled) {
          settled = true;
          resolve();
        }
      });

      subscription.error((error: unknown) => {
        window.clearTimeout(timeoutId);

        if (!settled) {
          settled = true;
          this.leaveRoom(normalizedRoom);
          reject(new Error(this.extractErrorMessage(error)));
        }
      });

      subscription.listen('.realtime.message', (payload: unknown) => {
        this.messages$.next(payload);
        this.roomMessages$.next({ room: normalizedRoom, payload });
      });
    });
  }

  leaveRoom(room: string): void {
    const normalizedRoom = room.trim();

    if (!normalizedRoom) {
      return;
    }

    this.roomSubscriptions.get(normalizedRoom)?.unbind();
    this.roomSubscriptions.delete(normalizedRoom);
    this.echo?.leave(normalizedRoom);
  }

  disconnect(): void {
    for (const room of Array.from(this.roomSubscriptions.keys())) {
      this.leaveRoom(room);
    }

    this.echo?.disconnect();
    this.echo = null;
    this.pusher = null;
    this.currentToken = null;
    this.connectionPromise = null;
    this.connected$.next(false);
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private ensureConnection(token: string): Promise<void> {
    if (!this.isBrowser || token.trim() === '') {
      this.disconnect();
      return Promise.reject(new Error('No se pudo abrir la conexion WebSocket.'));
    }

    if (this.echo && this.pusher && this.currentToken === token && this.pusher.connection.state === 'connected') {
      return Promise.resolve();
    }

    if (this.connectionPromise && this.currentToken === token) {
      return this.connectionPromise;
    }

    if (this.currentToken !== token) {
      this.disconnect();
    }

    this.currentToken = token;
    this.echo = this.createEcho(token);
    this.pusher = this.echo.connector.pusher;
    this.bindConnectionEvents(this.pusher);

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const pusher = this.pusher!;
      const timeoutId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          this.disconnect();
          reject(new Error('Tiempo de espera agotado al abrir la conexion WebSocket.'));
        }
      }, 8000);

      const handleConnected = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };

      const handleFailure = (error?: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        this.disconnect();
        reject(new Error(this.extractErrorMessage(error)));
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        pusher.connection.unbind('connected', handleConnected);
        pusher.connection.unbind('unavailable', handleFailure);
        pusher.connection.unbind('failed', handleFailure);
        pusher.connection.unbind('error', handleFailure);
        this.connectionPromise = null;
      };

      if (pusher.connection.state === 'connected') {
        handleConnected();
        return;
      }

      pusher.connection.bind('connected', handleConnected);
      pusher.connection.bind('unavailable', handleFailure);
      pusher.connection.bind('failed', handleFailure);
      pusher.connection.bind('error', handleFailure);
      pusher.connect();
    });

    return this.connectionPromise;
  }

  private createEcho(token: string): Echo<'reverb'> {
    (globalThis as { Pusher?: typeof Pusher }).Pusher = Pusher;
    const websocketUrl = new URL(KSOCKETWS);
    const useTls = websocketUrl.protocol === 'wss:';

    return new Echo({
      broadcaster: 'reverb',
      key: REVERB_CONFIG.appKey,
      wsHost: websocketUrl.hostname,
      wsPort: Number(websocketUrl.port || 80),
      wssPort: Number(websocketUrl.port || 443),
      forceTLS: useTls,
      enabledTransports: [useTls ? 'wss' : 'ws'],
      authorizer: (channel) => ({
        authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
          fetch(`${KSOCKETHTTP}/api/broadcasting/auth`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
            .then(async (response) => {
              const payload = await response.json().catch(() => ({}));

              if (!response.ok) {
                callback(new Error(this.extractErrorMessage(payload)), payload);
                return;
              }

              callback(null, payload);
            })
            .catch((error: unknown) => {
              callback(new Error(this.extractErrorMessage(error)), null);
            });
        },
      }),
    });
  }

  private bindConnectionEvents(pusher: Pusher): void {
    pusher.connection.bind('connected', () => {
      this.connected$.next(true);
    });

    pusher.connection.bind('disconnected', () => {
      this.connected$.next(false);
    });

    pusher.connection.bind('unavailable', () => {
      this.connected$.next(false);
    });

    pusher.connection.bind('failed', () => {
      this.connected$.next(false);
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }

    if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
      return error.error;
    }

    if (error && typeof error === 'object' && 'status' in error && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }

    if (typeof error === 'string' && error.trim() !== '') {
      return error;
    }

    if (error && typeof error === 'object' && 'error' in error && error.error && typeof error.error === 'object' && 'message' in error.error && typeof error.error.message === 'string') {
      return error.error.message;
    }

    return 'No se pudo abrir la conexion en tiempo real.';
  }
}
