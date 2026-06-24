import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { extractErrorMessage } from '../../shared/utils/whatsapp.utils';
import { trackById } from '../../shared/utils/form.utils';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActionTypeInterface, UpsertActionTypePayloadInterface } from '../../interfaces/action-type.interface';
import { ActionTypeService } from '../../services/action-type.service';
import { SharedModule } from '../../shared/shared.module';
import { ConfirmActionModalService } from '../../shared/components/confirm-action-modal/confirm-action-modal.service';

@Component({
  selector: 'app-actions',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './actions.html',
  styleUrl: './actions.scss',
})
export class Actions implements OnInit {
  protected readonly trackById = trackById;
  private readonly fb = inject(FormBuilder);
  private readonly actionTypeService = inject(ActionTypeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmService = inject(ConfirmActionModalService);

  actionTypes: ActionTypeInterface[] = [];
  loading = false;
  saving = false;
  selectedId: string | null = null;
  deletingId: string | null = null;
  feedback: string | null = null;
  error: string | null = null;

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly actionForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
    sort_order: [0, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });

  ngOnInit(): void {
    this.startCreate();
    this.loadActionTypes();
  }

  isEditing(): boolean {
    return !!this.selectedId;
  }

  search(): void {
    this.loadActionTypes();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '' });
    this.loadActionTypes();
  }

  startCreate(): void {
    this.selectedId = null;
    this.actionForm.reset({
      code: '',
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    });
    this.clearMessages();
  }

  edit(actionType: ActionTypeInterface): void {
    this.selectedId = actionType.id;
    this.actionForm.patchValue({
      code: actionType.code,
      name: actionType.name,
      description: actionType.description ?? '',
      sort_order: actionType.sort_order,
      is_active: actionType.is_active,
    });
    this.clearMessages();
  }

  save(): void {
    this.actionForm.markAllAsTouched();

    if (this.actionForm.invalid) {
      this.error = 'Completa los campos obligatorios del formulario.';
      return;
    }

    const formValue = this.actionForm.getRawValue();
    const payload: UpsertActionTypePayloadInterface = {
      code: (formValue.code ?? '').trim().toLowerCase(),
      name: (formValue.name ?? '').trim(),
      description: formValue.description?.trim() || null,
      sort_order: Number(formValue.sort_order ?? 0),
      is_active: !!formValue.is_active,
    };

    this.saving = true;
    this.clearMessages();
    const wasEditing = !!this.selectedId;

    const request$ = this.selectedId
      ? this.actionTypeService.update(this.selectedId, payload)
      : this.actionTypeService.create(payload);

    request$
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.loadActionTypes();
          this.startCreate();
          this.feedback = wasEditing
            ? 'Accion actualizada correctamente.'
            : 'Accion creada correctamente.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = extractErrorMessage(err, 'No se pudo guardar la accion.');
          this.cdr.markForCheck();
        },
      });
  }

  remove(actionType: ActionTypeInterface): void {
    this.confirmService.open(
      {
        title: 'Eliminar acción',
        message: '¿Seguro que deseas eliminar esta acción?',
        details: `Se eliminará la acción "${actionType.name}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        this.deletingId = actionType.id;
        this.clearMessages();
        this.cdr.markForCheck();

        this.actionTypeService
          .delete(actionType.id)
          .pipe(finalize(() => {
            this.deletingId = null;
            this.confirmService.close();
            this.cdr.markForCheck();
          }))
          .subscribe({
            next: () => {
              this.loadActionTypes();
              this.feedback = 'Accion eliminada correctamente.';
              if (this.selectedId === actionType.id) {
                this.startCreate();
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.error = extractErrorMessage(err, 'No se pudo eliminar la accion.');
              this.cdr.markForCheck();
            },
          });
      }
    );
  }

  private loadActionTypes(): void {
    this.loading = true;
    this.clearMessages();
    const search = this.searchForm.value.search?.trim();

    this.actionTypeService
      .getAll(search)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.actionTypes = data;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de acciones.';
          this.cdr.markForCheck();
        },
      });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }
}
