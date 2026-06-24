import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { extractErrorMessage } from '../../shared/utils/whatsapp.utils';
import { trackById } from '../../shared/utils/form.utils';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { ConfirmActionModalService } from '../../shared/components/confirm-action-modal/confirm-action-modal.service';
import { SystemParameterInterface, UpsertSystemParameterPayloadInterface } from '../../interfaces/system-parameter.interface';
import { SystemParameterService } from '../../services/system-parameter.service';

@Component({
  selector: 'app-system-parameters',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './system-parameters.html',
  styleUrl: './system.scss',
})
export class SystemParametersComponent implements OnInit {
  protected readonly trackById = trackById;
  private readonly fb = inject(FormBuilder);
  private readonly parameterService = inject(SystemParameterService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmService = inject(ConfirmActionModalService);
  private readonly fallbackTypeOptions = ['string', 'number', 'boolean', 'json', 'date', 'url'];

  parameters: SystemParameterInterface[] = [];
  loading = false;
  saving = false;
  selectedId: string | null = null;
  deletingId: string | null = null;
  feedback: string | null = null;
  error: string | null = null;

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly parameterForm = this.fb.group({
    group: ['', [Validators.required, Validators.maxLength(100)]],
    customGroup: ['', [Validators.maxLength(100)]],
    key: ['', [Validators.required, Validators.maxLength(100)]],
    value: ['', [Validators.required, Validators.maxLength(1000)]],
    type: ['', [Validators.required, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.startCreate();
    this.loadParameters();
  }

  isEditing(): boolean {
    return !!this.selectedId;
  }

  get groupOptions(): string[] {
    return [...new Set(this.parameters.map((p) => p.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get typeOptions(): string[] {
    const existing = this.parameters.map((p) => p.type).filter(Boolean);
    return [...new Set([...this.fallbackTypeOptions, ...existing])];
  }

  isNewGroupSelected(): boolean {
    return this.parameterForm.value.group === '__new__';
  }

  search(): void {
    this.loadParameters();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '' });
    this.loadParameters();
  }

  onGroupSelectionChange(): void {
    if (!this.isNewGroupSelected()) {
      this.parameterForm.patchValue({ customGroup: '' });
    }
  }

  startCreate(): void {
    const defaultGroup = this.groupOptions.length > 0 ? this.groupOptions[0] : '__new__';
    const defaultType = this.typeOptions[0] ?? 'string';

    this.selectedId = null;
    this.parameterForm.reset({
      group: defaultGroup,
      customGroup: '',
      key: '',
      value: '',
      type: defaultType,
      description: '',
    });
    this.clearMessages();
  }

  edit(parameter: SystemParameterInterface): void {
    const groupInOptions = this.groupOptions.includes(parameter.group);

    this.selectedId = parameter.id;
    this.parameterForm.patchValue({
      group: groupInOptions ? parameter.group : '__new__',
      customGroup: groupInOptions ? '' : parameter.group,
      key: parameter.key,
      value: parameter.value,
      type: parameter.type,
      description: parameter.description ?? '',
    });
    this.clearMessages();
  }

  save(): void {
    this.parameterForm.markAllAsTouched();

    if (this.parameterForm.invalid) {
      this.error = 'Completa los campos obligatorios del formulario.';
      return;
    }

    const selectedGroup = this.parameterForm.value.group ?? '';
    const normalizedGroup =
      selectedGroup === '__new__'
        ? (this.parameterForm.value.customGroup ?? '').trim()
        : selectedGroup.trim();

    if (!normalizedGroup) {
      this.error = 'Selecciona un grupo existente o registra un nuevo grupo.';
      return;
    }

    const payload: UpsertSystemParameterPayloadInterface = {
      group: normalizedGroup,
      key: this.parameterForm.value.key ?? '',
      value: this.parameterForm.value.value ?? '',
      type: this.parameterForm.value.type ?? '',
      description: this.parameterForm.value.description || null,
    };

    this.saving = true;
    this.clearMessages();
    const wasEditing = !!this.selectedId;

    const request$ = this.selectedId
      ? this.parameterService.update(this.selectedId, payload)
      : this.parameterService.create(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.loadParameters();
          this.startCreate();
          this.feedback = wasEditing
            ? 'Parámetro actualizado correctamente.'
            : 'Parámetro creado correctamente.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = extractErrorMessage(err, 'No se pudo guardar el parámetro.');
          this.cdr.markForCheck();
        },
      });
  }

  remove(parameter: SystemParameterInterface): void {
    this.confirmService.open(
      {
        title: 'Eliminar parámetro',
        message: '¿Seguro que deseas eliminar este parámetro?',
        details: `Se eliminará el parámetro "${parameter.key}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        this.deletingId = parameter.id;
        this.clearMessages();
        this.cdr.markForCheck();

        this.parameterService
          .delete(parameter.id)
          .pipe(finalize(() => {
            this.deletingId = null;
            this.confirmService.close();
            this.cdr.markForCheck();
          }))
          .subscribe({
            next: () => {
              this.loadParameters();
              this.feedback = 'Parámetro eliminado correctamente.';
              if (this.selectedId === parameter.id) {
                this.startCreate();
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.error = extractErrorMessage(err, 'No se pudo eliminar el parámetro.');
              this.cdr.markForCheck();
            },
          });
      }
    );
  }

  private loadParameters(): void {
    this.loading = true;
    this.clearMessages();
    const search = this.searchForm.value.search?.trim();

    this.parameterService
      .getAll(search)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.parameters = data;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de parámetros.';
          this.cdr.markForCheck();
        },
      });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }
}
