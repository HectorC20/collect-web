import { Injectable, signal } from '@angular/core';

type ConfirmActionModalConfig = {
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
};

@Injectable({ providedIn: 'root' })
export class ConfirmActionModalService {
  readonly isOpen = signal(false);
  readonly loading = signal(false);

  private config = signal<ConfirmActionModalConfig>({
    title: 'Confirmar acción',
    message: '¿Deseas continuar con esta acción?',
  });

  private onConfirmCallback: (() => void) | null = null;

  get title() {
    return this.config().title;
  }

  get message() {
    return this.config().message;
  }

  get details() {
    return this.config().details;
  }

  get confirmText() {
    return this.config().confirmText ?? 'Confirmar';
  }

  get cancelText() {
    return this.config().cancelText ?? 'Cancelar';
  }

  get variant() {
    return this.config().variant ?? 'primary';
  }

  open(config: ConfirmActionModalConfig, onConfirm: () => void) {
    this.config.set({
      title: config.title,
      message: config.message,
      details: config.details,
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      variant: config.variant,
    });
    this.onConfirmCallback = onConfirm;
    this.loading.set(false);
    this.isOpen.set(true);
  }

  confirm() {
    if (this.onConfirmCallback) {
      this.loading.set(true);
      this.onConfirmCallback();
    }
  }

  close() {
    this.isOpen.set(false);
    this.onConfirmCallback = null;
  }
}
