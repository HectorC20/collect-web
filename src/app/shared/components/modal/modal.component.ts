import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onClose.emit()">
      <article class="modal-card" [class.modal-wide]="isWide" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 *ngIf="title">{{ title }}</h3>
            <p *ngIf="description">{{ description }}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-circle" (click)="onClose.emit()" aria-label="Cerrar modal">
            ×
          </button>
        </div>
        <div class="modal-footer">
          <ng-content select="[modalFooter]"></ng-content>
        </div>
        <div class="modal-content">
          <ng-content></ng-content>
        </div>
      </article>
    </div>
  `,
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() isWide = false;
  @Input() title?: string;
  @Input() description?: string;

  @Output() onClose = new EventEmitter<void>();
}
