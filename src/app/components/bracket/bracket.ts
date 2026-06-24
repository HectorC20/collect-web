import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { extractErrorMessage } from '../../shared/utils/whatsapp.utils';
import { trackById } from '../../shared/utils/form.utils';
import { FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs';
import { BracketService } from '../../services/bracket.service';
import { SharedModule } from '../../shared/shared.module';
import { BracketModel } from '../../models/bracket.model';
import { ConfirmActionModalService } from '../../shared/components/confirm-action-modal/confirm-action-modal.service';

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './bracket.html',
  styleUrl: './bracket.scss',
})
export class BracketComponent implements OnInit {
  protected readonly trackById = trackById;
  private readonly fb = inject(FormBuilder);
  private readonly bracketService = inject(BracketService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmService = inject(ConfirmActionModalService);

  brackets: BracketModel[] = [];
  loading = false;
  saving = false;
  selectedId: string | null = null;
  deletingId: string | null = null;
  feedback: string | null = null;
  error: string | null = null;

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly bracketForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    min_days: [0, [Validators.required, Validators.min(0)]],
    max_days: [1, [Validators.required, Validators.min(1)]],
    color: ['#2563eb', [Validators.maxLength(20)]],
    is_default: [false],
    is_active: [true],
  });

  ngOnInit(): void {
    this.startCreate();
    this.loadBrackets();
  }

  isEditing(): boolean {
    return !!this.selectedId;
  }

  search(): void {
    this.loadBrackets();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '' });
    this.loadBrackets();
  }

  startCreate(): void {
    this.selectedId = null;
    this.bracketForm.reset({
      name: '',
      min_days: 0,
      max_days: 1,
      color: '#2563eb',
      is_default: false,
      is_active: true,
    });
    this.clearMessages();
  }

  edit(bracket: BracketModel): void {
    this.selectedId = bracket.id;
    this.bracketForm.patchValue({
      name: bracket.name,
      min_days: bracket.min_days,
      max_days: bracket.max_days,
      color: bracket.color ?? '#2563eb',
      is_default: bracket.is_default,
      is_active: bracket.is_active,
    });
    this.clearMessages();
  }

  save(): void {
    this.bracketForm.markAllAsTouched();

    if (this.bracketForm.invalid) {
      this.error = this.getFormValidationMessage();
      return;
    }

    const formValue = this.bracketForm.getRawValue();
    const minDays = Number(formValue.min_days ?? 0);
    const maxDays = Number(formValue.max_days ?? 0);
    const overlappingBracket = this.findOverlappingBracket(minDays, maxDays);

    if (maxDays <= 0) {
      this.error = 'Los días máximos deben ser mayores a 0.';
      return;
    }

    if (maxDays < minDays) {
      this.error = 'El valor máximo de días debe ser mayor o igual al mínimo.';
      return;
    }

    if (overlappingBracket) {
      this.error = `El rango ${minDays} - ${maxDays} se superpone con el tramo "${overlappingBracket.name}" (${overlappingBracket.min_days} - ${overlappingBracket.max_days}).`;
      return;
    }

    const payload = new BracketModel(
      '',
      (formValue.name ?? '').trim(),
      minDays,
      maxDays,
      formValue.color?.trim() || null,
      !!formValue.is_default,
      !!formValue.is_active,
    ).toJson('upsert');

    this.saving = true;
    this.clearMessages();
    const wasEditing = !!this.selectedId;

    const request$ = this.selectedId
      ? this.bracketService.update(this.selectedId, payload)
      : this.bracketService.create(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.loadBrackets();
          this.startCreate();
          this.feedback = wasEditing
            ? 'Tramo actualizado correctamente.'
            : 'Tramo creado correctamente.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = extractErrorMessage(err, 'No se pudo guardar el tramo.');
          this.cdr.markForCheck();
        },
      });
  }

  remove(bracket: BracketModel): void {
    this.confirmService.open(
      {
        title: 'Eliminar tramo',
        message: '¿Seguro que deseas eliminar este tramo?',
        details: `Se eliminará el tramo "${bracket.name}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        this.deletingId = bracket.id;
        this.clearMessages();
        this.cdr.markForCheck();

        this.bracketService
          .delete(bracket.id)
          .pipe(finalize(() => {
            this.deletingId = null;
            this.confirmService.close();
            this.cdr.markForCheck();
          }))
          .subscribe({
            next: () => {
              this.loadBrackets();
              this.feedback = 'Tramo eliminado correctamente.';
              if (this.selectedId === bracket.id) {
                this.startCreate();
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.error = extractErrorMessage(err, 'No se pudo eliminar el tramo.');
              this.cdr.markForCheck();
            },
          });
      }
    );
  }

  private loadBrackets(): void {
    this.loading = true;
    this.clearMessages();
    const search = this.searchForm.value.search?.trim();

    this.bracketService
      .getAll(search)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.brackets = data.map((item) => BracketModel.fromJson(item));
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de tramos.';
          this.cdr.markForCheck();
        },
      });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }

  getFieldError(controlName: 'name' | 'min_days' | 'max_days' | 'color'): string | null {
    const control = this.bracketForm.get(controlName);

    if (!control || !control.touched || !control.errors) {
      return null;
    }

    return this.getControlValidationMessage(controlName, control);
  }

  private findOverlappingBracket(minDays: number, maxDays: number): BracketModel | undefined {
    return this.brackets.find((bracket) =>
      bracket.id !== this.selectedId
      && bracket.min_days <= maxDays
      && bracket.max_days >= minDays
    );
  }

  private getFormValidationMessage(): string {
    const fieldOrder: Array<'name' | 'min_days' | 'max_days' | 'color'> = ['name', 'min_days', 'max_days', 'color'];

    for (const fieldName of fieldOrder) {
      const control = this.bracketForm.get(fieldName);
      if (control?.invalid) {
        return this.getControlValidationMessage(fieldName, control);
      }
    }

    return 'Corrige los campos marcados del formulario.';
  }

  private getControlValidationMessage(
    controlName: 'name' | 'min_days' | 'max_days' | 'color',
    control: AbstractControl
  ): string {
    if (control.hasError('required')) {
      switch (controlName) {
        case 'name':
          return 'El nombre del tramo es obligatorio.';
        case 'min_days':
          return 'Los días mínimos son obligatorios.';
        case 'max_days':
          return 'Los días máximos son obligatorios.';
        case 'color':
          return 'El color del tramo es obligatorio.';
      }
    }

    if (control.hasError('min')) {
      switch (controlName) {
        case 'min_days':
          return 'Los días mínimos no pueden ser menores a 0.';
        case 'max_days':
          return 'Los días máximos deben ser mayores a 0.';
      }
    }

    if (control.hasError('maxlength')) {
      switch (controlName) {
        case 'name':
          return 'El nombre del tramo no puede superar los 100 caracteres.';
        case 'color':
          return 'El color no puede superar los 20 caracteres.';
      }
    }

    return 'El valor ingresado no es válido.';
  }
}
