import { Injectable, signal } from '@angular/core';

export interface PageHeaderConfig {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  readonly config = signal<PageHeaderConfig | null>(null);

  setHeader(config: PageHeaderConfig): void {
    this.config.set(config);
  }

  clear(): void {
    this.config.set(null);
  }
}
