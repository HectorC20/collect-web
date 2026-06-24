import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin, map, Observable, switchMap, takeWhile, timer } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ConfirmActionModalService } from 'src/app/shared/components/confirm-action-modal/confirm-action-modal.service';
import { UserModel } from 'src/app/models/user.model';
import {
  UpsertWhatsappSessionPayload,
  WhatsappSessionLinkedUser,
  WhatsappSessionView,
} from 'src/app/interfaces/whatsappconversation.interface';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { WhatsappService } from 'src/app/services/whatsapp.service';
import { DEFAULT_SESSION_FORM } from 'src/app/shared/dictionary/whatsapp.dictionary';
import {
  canDisconnectSession,
  extractErrorMessage,
  getSessionStatusClass,
  getSessionStatusLabel,
  isSessionConnected,
} from 'src/app/shared/utils/whatsapp.utils';

type SessionLinkedUserView = WhatsappSessionLinkedUser & { is_primary: boolean };

@Component({
  selector: 'app-whatsapp-session-admin',
  standalone: true,
  imports: [SharedModule, ModalComponent],
  templateUrl: './whatsapp-session-admin.html',
  styleUrls: ['./whatsapp-session-admin.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappSessionAdminComponent implements OnInit {
  private qrPollingToken = 0;
  private qrAutoRefreshKey: string | null = null;
  private qrAutoRefreshInFlight = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly whatsappService = inject(WhatsappService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmActionModalService);

  protected readonly getSessionStatusClass = getSessionStatusClass;
  protected readonly getSessionStatusLabel = getSessionStatusLabel;

  readonly loading = signal(false);
  readonly actionLoading = signal(false);
  readonly sessions = signal<WhatsappSessionView[]>([]);
  readonly users = signal<UserModel[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);
  readonly showCreateSessionModal = signal(false);
  readonly showSessionSettingsModal = signal(false);

  selectedSessionId: string | null = null;
  currentNewSessionId: string | null = null;
  selectedLinkedUserId: string | null = null;

  readonly searchForm = this.fb.group({
    search: [''],
    linkedOnly: [false],
  });

  readonly sessionForm = this.fb.nonNullable.group({
    name: [DEFAULT_SESSION_FORM.name, [Validators.required, Validators.maxLength(120)]],
    ai_enabled: [DEFAULT_SESSION_FORM.ai_enabled],
    ignore_groups: [DEFAULT_SESSION_FORM.ignore_groups],
    ignore_status: [DEFAULT_SESSION_FORM.ignore_status],
    is_active: [DEFAULT_SESSION_FORM.is_active],
  });

  get activeSession(): WhatsappSessionView | null {
    return this.sessions().find((s) => s.id === this.selectedSessionId) ?? null;
  }

  get assignableUsers(): UserModel[] {
    const linkedIds = new Set(
      this.activeSession ? this.getLinkedUsers(this.activeSession).map((u) => u.id) : []
    );
    return this.users().filter((u) => !linkedIds.has(u.id));
  }

  get primaryAssignableUsers(): UserModel[] {
    const session = this.activeSession;

    if (!session) {
      return [];
    }

    return this.getPrimaryAssignableUsers(session);
  }

  get linkedSessionsCount(): number {
    return this.sessions().filter((s) => this.isSessionLinked(s)).length;
  }

  get pendingSessionsCount(): number {
    return this.sessions().filter((s) => !this.isSessionLinked(s)).length;
  }

  get filteredSessions(): WhatsappSessionView[] {
    const search = this.searchForm.value.search?.trim().toLowerCase() ?? '';
    const linkedOnly = this.searchForm.value.linkedOnly ?? false;

    return this.sessions().filter((session) => {
      const matchesSearch =
        session.name.toLowerCase().includes(search) ||
        (session.phone_number && session.phone_number.toLowerCase().includes(search)) ||
        (session.push_name && session.push_name.toLowerCase().includes(search));

      const matchesLinked = !linkedOnly || this.isSessionLinked(session);

      return matchesSearch && matchesLinked;
    });
  }

  get collectorUsers(): UserModel[] {
    return this.users();
  }

  getSessionConnectionLabel(session: WhatsappSessionView): string {
    return this.isSessionLinked(session) ? 'Vinculada' : 'Requiere conexion';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      sessions: this.whatsappService.getSessions(),
      users: this.userService.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessions, users }) => {
          this.sessions.set(sessions);
          this.users.set(users);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las sesiones.');
          this.loading.set(false);
        },
      });
  }

  openCreateSessionModal(): void {
    this.sessionForm.reset(DEFAULT_SESSION_FORM);
    this.currentNewSessionId = null;
    this.showCreateSessionModal.set(true);
  }

  closeCreateSessionModal(): void {
    if (this.currentNewSessionId) {
      this.whatsappService.deleteSession(this.currentNewSessionId).subscribe();
    }
    this.showCreateSessionModal.set(false);
    this.currentNewSessionId = null;
  }

  openSessionSettingsModal(session: WhatsappSessionView): void {
    this.selectedSessionId = session.id;
    this.selectedLinkedUserId = null;
    this.showSessionSettingsModal.set(true);
  }

  closeSessionSettingsModal(): void {
    this.showSessionSettingsModal.set(false);
    this.selectedSessionId = null;
  }

  createSession(): void {
    if (this.sessionForm.invalid) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.whatsappService
      .createSession(this.sessionForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: (session) => {
          this.currentNewSessionId = session.id;
          this.sessions.update((sessions) => [...sessions, session]);
          this.feedbackMessage.set('Sesión creada. Generando código QR...');
          this.startQrPolling(session.id);
        },
        error: () => {
          this.errorMessage.set('No se pudo crear la sesión.');
        },
      });
  }

  finishCreateSession(): void {
    if (this.currentNewSessionId) {
      const session = this.newSession;
      if (session && !this.isSessionLinked(session)) {
        this.whatsappService.deleteSession(this.currentNewSessionId).subscribe({
          next: () => {
            this.sessions.update((sessions) =>
              sessions.filter((s) => s.id !== this.currentNewSessionId)
            );
          },
        });
      }
    }
    this.showCreateSessionModal.set(false);
    this.currentNewSessionId = null;
  }

  get newSession(): WhatsappSessionView | null {
    return this.sessions().find((s) => s.id === this.currentNewSessionId) ?? null;
  }

  getQrStatusText(session: WhatsappSessionView | null): string {
    if (!session) return 'Generando código QR...';
    if (this.isSessionLinked(session)) {
      return 'Vinculada correctamente!';
    }
    if (session.qr_code) {
      return 'Escanea el código QR';
    }
    return 'Generando código QR...';
  }

  isSessionLinked(session: WhatsappSessionView | null): boolean {
    return isSessionConnected(session);
  }

  canDisconnect(session: WhatsappSessionView | null): boolean {
    return canDisconnectSession(session);
  }

  getConnectionActionLabel(session: WhatsappSessionView | null): string {
    return this.canDisconnect(session) ? 'Desconectar' : 'Conectar';
  }

  toggleSessionConnection(session: WhatsappSessionView): void {
    if (this.canDisconnect(session)) {
      this.disconnectSession(session);
      return;
    }

    this.connectSession(session);
  }

  getSessionPhoneDisplay(session: WhatsappSessionView): string {
    if (session.phone_number) return session.phone_number;
    if (session.push_name) return session.push_name;
    return 'Sin vincular';
  }

  getLinkedUsers(session: WhatsappSessionView): SessionLinkedUserView[] {
    const users: SessionLinkedUserView[] = [];

    if (session.assigned_user) {
      users.push({
        ...session.assigned_user,
        is_primary: true,
      });
    }

    if (session.authorized_users) {
      users.push(
        ...session.authorized_users.map((u) => ({
          ...u,
          is_primary: false,
        }))
      );
    }

    return users;
  }

  getAvailableUsersToLink(session: WhatsappSessionView): UserModel[] {
    const linkedIds = new Set(this.getLinkedUsers(session).map((u) => u.id));
    return this.users().filter((u) => !linkedIds.has(u.id));
  }

  getLinkedUsersSummary(session: WhatsappSessionView): string {
    const users = this.getLinkedUsers(session);
    if (users.length === 0) return 'Sin usuarios';
    if (users.length === 1) return users[0].full_name;
    return `${users[0].full_name} y ${users.length - 1} más`;
  }

  connectSession(session: WhatsappSessionView): void {
    this.selectedSessionId = session.id;
    this.executeAction(this.whatsappService.connectSession(session.id), 'Solicitando QR...', () =>
      this.startQrPolling(session.id)
    );
  }

  disconnectSession(session: WhatsappSessionView): void {
    this.selectedSessionId = session.id;
    this.executeAction(
      this.whatsappService.disconnectSession(session.id),
      'Sesión desconectada.'
    );
  }

  deleteSession(session: WhatsappSessionView): void {
    this.confirmService.open(
      {
        title: 'Eliminar sesión',
        message: '¿Seguro que deseas eliminar esta sesión?',
        details: `Se eliminará la sesión "${session.name}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        this.executeAction(
          this.whatsappService.deleteSession(session.id),
          'Sesión eliminada.',
          () => {
            if (this.selectedSessionId === session.id) {
              this.closeSessionSettingsModal();
            }
            this.confirmService.close();
          }
        );
      }
    );
  }

  updateSelectedSession(patch: UpsertWhatsappSessionPayload): void {
    if (!this.activeSession) return;
    this.executeAction(
      this.whatsappService.updateSession(this.activeSession.id, patch),
      'Sesión actualizada.'
    );
  }

  linkUserToSession(session: WhatsappSessionView): void {
    if (!this.selectedLinkedUserId) return;

    const authorizedUserIds = [
      ...session.authorized_users.map((user) => user.id),
      this.selectedLinkedUserId,
    ];

    this.executeAction(
      this.whatsappService.updateSession(session.id, {
        authorized_user_ids: authorizedUserIds,
      }),
      'Usuario vinculado correctamente.',
      () => {
        this.selectedLinkedUserId = null;
      }
    );
  }

  unlinkUserFromSession(session: WhatsappSessionView, userId: string): void {
    const isPrimaryUser = session.user_id === userId;
    const authorizedUserIds = session.authorized_users
      .map((user) => user.id)
      .filter((id) => id !== userId);

    const targetUser = this.getLinkedUsers(session).find((user) => user.id === userId);
    const message = isPrimaryUser
      ? `Se desvinculará a ${targetUser?.full_name ?? 'este usuario'} como usuario principal de la sesión.`
      : `Se revocará el acceso de ${targetUser?.full_name ?? 'este usuario'} a esta sesión.`;

    this.confirmService.open(
      {
        title: 'Desvincular usuario',
        message,
        details: 'El usuario dejará de tener acceso a esta sesión de WhatsApp.',
        confirmText: 'Desvincular',
        variant: 'danger',
      },
      () => {
        this.executeAction(
          this.whatsappService.updateSession(session.id, {
            user_id: isPrimaryUser ? null : session.user_id,
            authorized_user_ids: authorizedUserIds,
          }),
          'Usuario desvinculado correctamente.',
          () => {
            if (this.selectedLinkedUserId === userId) {
              this.selectedLinkedUserId = null;
            }
            this.confirmService.close();
          }
        );
      }
    );
  }

  refresh(): void {
    this.loadData();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '', linkedOnly: false });
    this.loadData();
  }

  trackBySession(_: number, session: WhatsappSessionView): string {
    return session.id;
  }

  private getPrimaryAssignableUsers(session: WhatsappSessionView): UserModel[] {
    const availableUsers = this.getAvailableUsersToLink(session);
    const primaryUserId = session.user_id;

    if (!primaryUserId) {
      return availableUsers;
    }

    const currentPrimaryUser = this.users().find((user) => user.id === primaryUserId);

    if (!currentPrimaryUser) {
      return availableUsers;
    }

    return [currentPrimaryUser, ...availableUsers];
  }

  private startQrPolling(sessionId: string): void {
    const pollingToken = ++this.qrPollingToken;

    timer(1200, 1800)
      .pipe(
        switchMap(() => this.whatsappService.getSessions()),
        map((sessions) => ({
          sessions,
          session: sessions.find((s) => s.id === sessionId) ?? null,
        })),
        takeWhile(({ session }) => {
          if (pollingToken !== this.qrPollingToken) {
            return false;
          }

          if (!session) {
            return false;
          }

          if (this.isSessionLinked(session)) {
            return false;
          }

          return true;
        }, true),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ sessions, session }) => {
          this.sessions.set(sessions);

          if (!session || pollingToken !== this.qrPollingToken) {
            return;
          }

          if (this.isSessionLinked(session)) {
            this.feedbackMessage.set('Sesión vinculada correctamente!');
            return;
          }

          if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
            this.feedbackMessage.set('QR expirado. Generando nuevo código...');
            this.whatsappService.connectSession(sessionId).subscribe();
            return;
          }

          if (session.qr_code) {
            this.feedbackMessage.set('QR generado. Escanea para vincular.');
            return;
          }

          this.feedbackMessage.set('Generando código QR...');
        },
        error: () => {
          // Polling errors are non-critical
        },
      });
  }

  private executeAction(
    action$: Observable<any>,
    successMessage?: string,
    onSuccess?: () => void
  ): void {
    this.actionLoading.set(true);
    this.errorMessage.set(null);
    this.feedbackMessage.set(null);

    action$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.loadData();
          if (successMessage) {
            this.feedbackMessage.set(successMessage);
          }
          if (onSuccess) {
            onSuccess();
          }
        },
        error: (err) => {
          this.errorMessage.set(extractErrorMessage(err, 'No se pudo completar la acción.'));
        },
      });
  }
}
