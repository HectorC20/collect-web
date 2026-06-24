import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { extractErrorMessage } from '../../shared/utils/whatsapp.utils';
import { trackById } from '../../shared/utils/form.utils';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { BracketInterface } from '../../interfaces/bracket.interface';
import { SharedModule } from '../../shared/shared.module';
import { UserModel, UpsertUserPayload } from '../../models/user.model';
import { RoleInterface } from '../../interfaces/role.interface';
import { BracketService } from '../../services/bracket.service';
import { UserService } from '../../services/user.service';
import { getRoleDictionaryEntry } from '../../shared/dictionary/main';
import { ConfirmActionModalService } from '../../shared/components/confirm-action-modal/confirm-action-modal.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  protected readonly trackById = trackById;
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly bracketService = inject(BracketService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmService = inject(ConfirmActionModalService);

  users: UserModel[] = [];
  roles: RoleInterface[] = [];
  brackets: BracketInterface[] = [];
  loading = false;
  loadingBrackets = false;
  saving = false;
  selectedId: string | null = null;
  deletingId: string | null = null;
  feedback: string | null = null;
  error: string | null = null;
  selectedBracketIds = new Set<string>();

  readonly collectorAccessOptions = [
    { value: 'all_clients', label: 'Acceso a todos los clientes' },
    { value: 'assigned_brackets', label: 'Solo tramos asignados' },
  ] as const;

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly userForm = this.fb.group({
    roleId: ['', [Validators.required]],
    full_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: [''],
    dni: ['', [Validators.maxLength(20)]],
    phone: ['', [Validators.maxLength(20)]],
    portfolio_access_scope: ['assigned_brackets' as 'all_clients' | 'assigned_brackets'],
    is_active: [true],
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadBrackets();
    this.startCreate();
    this.loadUsers();

    this.userForm.get('roleId')?.valueChanges.subscribe(() => {
      this.handleRoleSelectionChange();
      this.cdr.markForCheck();
    });

    this.userForm.get('portfolio_access_scope')?.valueChanges.subscribe((scope) => {
      if (scope === 'all_clients') {
        this.selectedBracketIds.clear();
      }
      this.cdr.markForCheck();
    });
  }

  isEditing(): boolean {
    return !!this.selectedId;
  }

  get passwordRequired(): boolean {
    return !this.selectedId;
  }

  get isCollectorRoleSelected(): boolean {
    const roleId = this.userForm.value.roleId ?? '';
    const role = this.roles.find((item) => item.id === roleId);

    return (role?.name ?? '').trim().toLowerCase() === 'collector';
  }

  search(): void {
    this.loadUsers();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '' });
    this.loadUsers();
  }

  startCreate(): void {
    this.selectedId = null;
    this.userForm.reset({
      roleId: this.roles.length > 0 ? this.roles[0].id : '',
      full_name: '',
      email: '',
      password: '',
      dni: '',
      phone: '',
      portfolio_access_scope: 'assigned_brackets',
      is_active: true,
    });
    this.selectedBracketIds = new Set<string>();
    this.userForm.get('password')?.setValidators([Validators.required]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.handleRoleSelectionChange();
    this.clearMessages();
  }

  edit(user: UserModel): void {
    this.selectedId = user.id;
    this.userForm.patchValue({
      roleId: user.roleId,
      full_name: user.full_name,
      email: user.email,
      password: '',
      dni: user.dni ?? '',
      phone: user.phone ?? '',
      portfolio_access_scope: user.portfolio_access_scope ?? 'assigned_brackets',
      is_active: user.is_active,
    });
    this.selectedBracketIds = new Set((user.brackets ?? []).map((bracket) => bracket.id));
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.handleRoleSelectionChange();
    this.clearMessages();
  }

  save(): void {
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) {
      this.error = 'Completa los campos obligatorios del formulario.';
      return;
    }

    const formValue = this.userForm.value;
    const passwordValue = formValue.password?.trim();

    if (!this.selectedId && !passwordValue) {
      this.error = 'La contraseña es obligatoria para crear un usuario.';
      return;
    }

    if (
      this.isCollectorRoleSelected &&
      this.userForm.value.portfolio_access_scope === 'assigned_brackets' &&
      this.selectedBracketIds.size === 0
    ) {
      this.error = 'Selecciona al menos un tramo para el cobrador o habilita acceso a todos los clientes.';
      return;
    }

    const payload: UpsertUserPayload = {
      roleId: formValue.roleId ?? '',
      full_name: formValue.full_name ?? '',
      email: formValue.email ?? '',
      dni: formValue.dni?.trim() || null,
      phone: formValue.phone?.trim() || null,
      portfolio_access_scope: this.isCollectorRoleSelected
        ? formValue.portfolio_access_scope ?? 'assigned_brackets'
        : 'all_clients',
      bracketIds: this.isCollectorRoleSelected ? Array.from(this.selectedBracketIds) : [],
      is_active: formValue.is_active ?? true,
    };

    if (passwordValue) {
      payload.password = passwordValue;
    }

    this.saving = true;
    this.clearMessages();
    const wasEditing = !!this.selectedId;

    const request$ = this.selectedId
      ? this.userService.update(this.selectedId, payload)
      : this.userService.create(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.loadUsers();
        this.startCreate();
        this.feedback = wasEditing
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = extractErrorMessage(err, 'No se pudo guardar el usuario.');
        this.cdr.markForCheck();
      },
    });
  }

  remove(user: UserModel): void {
    this.confirmService.open({
      title: 'Eliminar usuario',
      message: '¿Seguro que deseas eliminar al usuario?',
      details: `Se eliminará al usuario "${user.full_name}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    }, () => {
      this.deletingId = user.id;
      this.clearMessages();
      this.cdr.markForCheck();

      this.userService
        .delete(user.id)
        .pipe(finalize(() => {
          this.deletingId = null;
          this.confirmService.close();
          this.cdr.markForCheck();
        }))
        .subscribe({
          next: () => {
            this.loadUsers();
            this.feedback = 'Usuario eliminado correctamente.';
            if (this.selectedId === user.id) {
              this.startCreate();
            }
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.error = extractErrorMessage(err, 'No se pudo eliminar el usuario.');
            this.cdr.markForCheck();
          },
        });
    });
  }

  toggleBracket(bracketId: string, checked: boolean): void {
    const next = new Set(this.selectedBracketIds);

    if (checked) {
      next.add(bracketId);
    } else {
      next.delete(bracketId);
    }

    this.selectedBracketIds = next;
  }

  isBracketSelected(bracketId: string): boolean {
    return this.selectedBracketIds.has(bracketId);
  }

  getRoleLabel(roleName?: string | null): string {
    return getRoleDictionaryEntry(roleName).label;
  }

  getRoleBadgeStyle(roleName?: string | null): Record<string, string> {
    const entry = getRoleDictionaryEntry(roleName);

    return {
      background: entry.background,
      color: entry.color,
      borderColor: entry.borderColor,
    };
  }

  private loadUsers(): void {
    this.loading = true;
    this.clearMessages();
    const search = this.searchForm.value.search?.trim();

    this.userService
      .getAll(search)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.users = data;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de usuarios.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        if (this.roles.length > 0 && !this.selectedId) {
          this.userForm.patchValue({ roleId: this.roles[0].id });
        }
        this.handleRoleSelectionChange();
        this.cdr.markForCheck();
      },
    });
  }

  private loadBrackets(): void {
    this.loadingBrackets = true;

    this.bracketService
      .getAll()
      .pipe(finalize(() => {
        this.loadingBrackets = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.brackets = data.filter((bracket) => bracket.is_active);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de tramos.';
          this.cdr.markForCheck();
        },
      });
  }

  private handleRoleSelectionChange(): void {
    if (this.isCollectorRoleSelected) {
      if (!this.userForm.value.portfolio_access_scope) {
        this.userForm.patchValue({ portfolio_access_scope: 'assigned_brackets' }, { emitEvent: false });
      }
      return;
    }

    this.selectedBracketIds.clear();
    this.userForm.patchValue({ portfolio_access_scope: 'all_clients' }, { emitEvent: false });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }
}
