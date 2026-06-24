import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmActionModalService } from './confirm-action-modal.service';

@Component({
  selector: 'app-confirm-action-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './confirm-action-modal.html',
  styleUrl: './confirm-action-modal.scss',
})
export class ConfirmActionModalComponent {
  readonly service = inject(ConfirmActionModalService);
}
