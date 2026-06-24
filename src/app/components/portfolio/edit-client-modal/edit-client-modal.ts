import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { PortfolioClientInterface } from '../../../interfaces/portfolio.interface';
import { PortfolioService } from '../../../services/portfolio.service';
import { SharedModule } from '../../../shared/shared.module';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-edit-client-modal',
  standalone: true,
  imports: [SharedModule, ModalComponent],
  templateUrl: './edit-client-modal.html',
  styleUrl: './edit-client-modal.scss',
})
export class EditClientModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly portfolioService = inject(PortfolioService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly clientForm = this.fb.group({
    full_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    district: ['', [Validators.maxLength(120)]],
    province: ['', [Validators.maxLength(120)]],
    department: ['', [Validators.maxLength(120)]],
    dni: ['', [Validators.maxLength(20)]],
  });

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<PortfolioClientInterface>();

  private _client: PortfolioClientInterface | null = null;

  @Input()
  set client(value: PortfolioClientInterface | null) {
    this._client = value;
    this.feedback = null;
    this.error = null;

    this.clientForm.reset({
      full_name: value?.fullName ?? '',
      email: value?.email ?? '',
      phone: value?.phone ?? '',
      address: value?.address ?? '',
      district: value?.district ?? '',
      province: value?.province ?? '',
      department: value?.department ?? '',
      dni: value?.dni ?? '',
    });
  }

  get client(): PortfolioClientInterface | null {
    return this._client;
  }

  saving = false;
  feedback: string | null = null;
  error: string | null = null;

  save(): void {
    if (!this.client) {
      return;
    }

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.feedback = null;
    this.error = null;

    const formValue = this.clientForm.getRawValue();

    this.portfolioService
      .updateClientPersonalData({
        clientId: this.client.id,
        full_name: formValue.full_name?.trim() ?? '',
        email: formValue.email?.trim() || null,
        phone: formValue.phone?.trim() || null,
        address: formValue.address?.trim() || null,
        district: formValue.district?.trim() || null,
        province: formValue.province?.trim() || null,
        department: formValue.department?.trim() || null,
        dni: formValue.dni?.trim() || null,
      })
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.feedback = 'Cliente actualizado correctamente.';
          setTimeout(() => {
            this.saved.emit(updatedClient);
            this.closed.emit();
          }, 800);
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo actualizar el cliente.';
        },
      });
  }

  cancel(): void {
    this.closed.emit();
  }
}
