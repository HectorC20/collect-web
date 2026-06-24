import { Component, DoCheck, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { PageHeaderService } from '../../../services/page-header.service';

@Component({
  selector: 'app-page-header',
  template: '',
  standalone: false,
})
export class PageHeaderComponent implements OnChanges, OnDestroy {
  private readonly pageHeader = inject(PageHeaderService);

  @Input() eyebrow: string | null = null;
  @Input({ required: true }) title = '';
  @Input() description: string | null = null;

  ngOnInit(): void {
    this.syncHeader();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.syncHeader();
  }

  ngDoCheck(): void {
    const current = this.pageHeader.config();
    const next = this.buildConfig();

    if (
      next !== null
      && (
        current === null
        || current.eyebrow !== next.eyebrow
        || current.title !== next.title
        || current.description !== next.description
      )
    ) {
      this.pageHeader.setHeader(next);
    }
  }

  ngOnDestroy(): void {
    this.pageHeader.clear();
  }

  private syncHeader(): void {
    const next = this.buildConfig();

    if (next === null) {
      this.pageHeader.clear();
      return;
    }

    this.pageHeader.setHeader(next);
  }

  private buildConfig() {
    const title = this.title.trim();

    if (!title) {
      return null;
    }

    return {
      eyebrow: this.eyebrow?.trim() || null,
      title,
      description: this.description?.trim() || null,
    };
  }
}
