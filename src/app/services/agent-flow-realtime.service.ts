import { Injectable, inject } from '@angular/core';
import { filter, map } from 'rxjs';
import { AgentFlowEventInterface } from '../interfaces/agentllm-admin.interface';
import { WebsocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class AgentFlowRealtimeService {
  private readonly websocketService = inject(WebsocketService);
  private currentRoom: string | null = null;

  readonly connected$ = this.websocketService.connected$;
  readonly events$ = this.websocketService.roomMessages$.pipe(
    filter((message) => this.currentRoom !== null && message.room === this.currentRoom),
    map((message) => message.payload)
  );

  openRoom(room: string): Promise<void> {
    const trimmedRoom = room.trim();

    if (trimmedRoom === '') {
      this.leaveRoom();
      return Promise.reject(new Error('No se pudo inicializar la sala WebSocket en tiempo real.'));
    }

    if (this.currentRoom === trimmedRoom) {
      return Promise.resolve();
    }

    this.leaveRoom();
    this.currentRoom = trimmedRoom;

    return this.websocketService.joinRoom(trimmedRoom);
  }

  leaveRoom(): void {
    if (this.currentRoom) {
      this.websocketService.leaveRoom(this.currentRoom);
      this.currentRoom = null;
    }
  }

  parseEvent(message: unknown): AgentFlowEventInterface | null {
    try {
      const parsed = typeof message === 'string'
        ? JSON.parse(message) as AgentFlowEventInterface
        : message as AgentFlowEventInterface;

      return parsed && typeof parsed.type === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }
}
