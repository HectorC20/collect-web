import { Injectable, inject } from '@angular/core';
import { filter, map } from 'rxjs';
import { PortfolioAlertRealtimeEventInterface } from '../interfaces/portfolio-alert.interface';
import { websocketRoom } from '../room/websocket-room';
import { PORTFOLIO_ALERT_REALTIME } from '../shared/dictionary/portfolio-alert.dictionary';
import { WebsocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class PortfolioAlertRealtimeService {
  private readonly websocketService = inject(WebsocketService);
  private currentRoom: string | null = null;

  readonly connected$ = this.websocketService.connected$;
  readonly events$ = this.websocketService.roomMessages$.pipe(
    filter((message) => this.currentRoom !== null && message.room === this.currentRoom),
    map((message) => this.parseEvent(message.payload)),
    filter((event): event is PortfolioAlertRealtimeEventInterface => event !== null)
  );

  openCollectorRoom(userId: string): Promise<void> {
    const normalizedUserId = userId.trim();

    if (normalizedUserId === '') {
      this.leaveRoom();
      return Promise.reject(new Error('No se pudo abrir la sala de alertas.'));
    }

    const nextRoom = websocketRoom.portfolioAlertCollector(normalizedUserId);

    if (this.currentRoom === nextRoom) {
      return Promise.resolve();
    }

    this.leaveRoom();
    this.currentRoom = nextRoom;

    return this.websocketService.joinRoom(nextRoom);
  }

  leaveRoom(): void {
    if (!this.currentRoom) {
      return;
    }

    this.websocketService.leaveRoom(this.currentRoom);
    this.currentRoom = null;
  }

  private parseEvent(payload: unknown): PortfolioAlertRealtimeEventInterface | null {
    try {
      const parsed = typeof payload === 'string'
        ? JSON.parse(payload) as PortfolioAlertRealtimeEventInterface
        : payload as PortfolioAlertRealtimeEventInterface;

      if (!parsed || parsed.namespace !== PORTFOLIO_ALERT_REALTIME.namespace) {
        return null;
      }

      return parsed.type === PORTFOLIO_ALERT_REALTIME.refreshType ? parsed : null;
    } catch {
      return null;
    }
  }
}
