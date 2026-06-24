import { Injectable, signal } from '@angular/core';

export type SnackbarVariant = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarState {
  message: string;
  variant: SnackbarVariant;
  visible: boolean;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private hideTimeoutId: number | null = null;

  readonly state = signal<SnackbarState | null>(null);

  show(
    message: string,
    variant: SnackbarVariant = 'info',
    durationMs = 3200,
  ): void {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      return;
    }

    this.clearHideTimer();

    this.state.set({
      message: normalizedMessage,
      variant,
      visible: true,
      durationMs,
    });

    this.hideTimeoutId = window.setTimeout(() => {
      this.dismiss();
    }, durationMs);
  }

  success(message: string, durationMs?: number): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs?: number): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs?: number): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs?: number): void {
    this.show(message, 'warning', durationMs);
  }

  dismiss(): void {
    this.clearHideTimer();
    this.state.set(null);
  }

  private clearHideTimer(): void {
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
  }
}
