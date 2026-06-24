import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, merge, Subject, Observable } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { ConfirmActionModalService } from '../../shared/components/confirm-action-modal/confirm-action-modal.service';
import {
  UpsertWhatsappSessionPayload,
  WhatsappChatView,
  WhatsappClientContactView,
  WhatsappMessageView,
  WhatsappOverviewView,
  WhatsappSessionView,
  WhatsappClientSummary,
} from '../../interfaces/whatsappconversation.interface';
import { WhatsappService } from '../../services/whatsapp.service';
import { UserService } from '../../services/user.service';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

import { DEFAULT_SESSION_FORM } from '../../shared/dictionary/whatsapp.dictionary';
import {
  getSessionStatusClass,
  getSessionStatusLabel,
  getMessageStatusIcon,
  extractErrorMessage
} from '../../shared/utils/whatsapp.utils';

@Component({
  selector: 'app-whatsappclient',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './whatsappclient.html',
  styleUrl: './whatsappclient.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whatsappclient implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly whatsappService = inject(WhatsappService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly refresh$ = new Subject<void>();
  private readonly refreshUsers$ = new Subject<void>();
  private readonly confirmService = inject(ConfirmActionModalService);

  selectedSessionId: string | null = null;
  selectedChatId: string | null = null;

  protected readonly getSessionStatusClass = getSessionStatusClass;
  protected readonly getSessionStatusLabel = getSessionStatusLabel;
  protected readonly getMessageStatusIcon = getMessageStatusIcon;

  readonly searchForm = this.fb.group({
    search: [''],
    unreadOnly: [false],
  });

  readonly sessionForm = this.fb.nonNullable.group({
    name: [DEFAULT_SESSION_FORM.name, [Validators.required, Validators.maxLength(120)]],
    ai_enabled: [DEFAULT_SESSION_FORM.ai_enabled],
    ignore_groups: [DEFAULT_SESSION_FORM.ignore_groups],
    ignore_status: [DEFAULT_SESSION_FORM.ignore_status],
    is_active: [DEFAULT_SESSION_FORM.is_active],
  });

  readonly composerForm = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  readonly loading = signal(false);
  readonly actionLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showCreateSessionModal = signal(false);
  readonly showSessionSettingsModal = signal(false);

  readonly overview = signal<WhatsappOverviewView | null>(null);
  readonly sessions = signal<WhatsappSessionView[]>([]);
  readonly chats = signal<WhatsappChatView[]>([]);
  readonly contacts = signal<WhatsappClientContactView[]>([]);
  readonly users = signal<UserModel[]>([]);
  readonly currentSession = signal<WhatsappSessionView | null>(null);
  readonly currentChat = signal<WhatsappChatView | null>(null);
  readonly currentContact = signal<WhatsappClientContactView | null>(null);
  readonly messages = signal<WhatsappMessageView[]>([]);

  get activeSession(): WhatsappSessionView | null {
    return this.currentSession();
  }

  get activeChat(): WhatsappChatView | null {
    return this.currentChat();
  }

  get activeClient(): WhatsappClientSummary | null {
    return this.currentChat()?.client ?? this.currentContact()?.client ?? null;
  }

  get isAdminOrSuperCollector(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return ['admin', 'super_collector'].includes(userRole);
  }

  get isCollector(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return userRole === 'collector';
  }

  get filteredSessions(): WhatsappSessionView[] {
    const user = this.authService.getUser();
    if (!user) return [];

    const userRole = user.role?.name?.toLowerCase() ?? '';
    
    if (userRole === 'admin' || userRole === 'super_collector') {
      return this.sessions();
    }

    return this.sessions().filter((session) => 
      session.assigned_user?.id === user.id || 
      session.authorized_users.some((u) => u.id === user.id)
    );
  }

  get linkedSessionsCount(): number {
    return this.filteredSessions.filter((s) => this.isSessionLinked(s)).length;
  }

  get pendingSessionsCount(): number {
    return this.filteredSessions.filter((s) => !this.isSessionLinked(s)).length;
  }

  get totalChats(): number {
    return this.chats().length;
  }

  get totalUnread(): number {
    return this.chats().reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
  }

  get filteredChats(): WhatsappChatView[] {
    const search = this.searchForm.value.search?.trim().toLowerCase() ?? '';
    const unreadOnly = this.searchForm.value.unreadOnly ?? false;

    return this.chats().filter((chat) => {
      const matchesSearch =
        this.getChatTitle(chat).toLowerCase().includes(search) ||
        (chat.phone_number?.toLowerCase().includes(search)) ||
        (chat.last_message_text?.toLowerCase().includes(search)) ||
        (chat.client?.dni?.toLowerCase().includes(search));

      const matchesUnread = !unreadOnly || chat.unread_count > 0;

      return matchesSearch && matchesUnread;
    });
  }

  get filteredContacts(): WhatsappClientContactView[] {
    const search = this.searchForm.value.search?.trim().toLowerCase() ?? '';

    return this.contacts().filter((contact) => {
      const phones = [contact.client.phone, ...(contact.client.phone_history ?? [])]
        .map((phone) => phone?.toLowerCase() ?? '');

      return search === ''
        || (contact.client.full_name?.toLowerCase().includes(search) ?? false)
        || (contact.client.dni?.toLowerCase().includes(search) ?? false)
        || phones.some((phone) => phone.includes(search));
    });
  }

  getChatTitle(chat: WhatsappChatView): string {
    if (chat.client?.full_name) return chat.client.full_name;
    if (chat.display_name) return chat.display_name;
    return chat.phone_number || chat.remote_jid;
  }

  getChatPreviewText(chat: WhatsappChatView): string {
    return chat.last_message_text || 'Sin mensajes';
  }

  getChatSecondaryLine(chat: WhatsappChatView): string | null {
    if (chat.client?.current_bracket?.name) return chat.client.current_bracket.name;
    return null;
  }

  getClientPhonesSummary(client: WhatsappClientSummary | null): string {
    if (!client) {
      return '-';
    }

    const phones = [client.phone, ...(client.phone_history ?? [])]
      .map((phone) => phone?.trim() ?? '')
      .filter((phone, index, collection) => phone !== '' && collection.indexOf(phone) === index);

    return phones.length > 0 ? phones.join(' / ') : '-';
  }

  getContactPrimaryPhone(contact: WhatsappClientContactView): string {
    return contact.client.phone?.trim() || '-';
  }

  hasLinkedChat(contact: WhatsappClientContactView): boolean {
    return !!contact.linked_chat_id;
  }

  getSessionConnectionLabel(session: WhatsappSessionView): string {
    if (session.status === 'connected') return 'Conectado';
    if (session.status === 'qr_pending') return 'Esperando QR';
    if (session.status === 'connecting') return 'Conectando';
    if (session.status === 'logged_out') return 'Desconectado';
    return 'Desconocido';
  }

  isSessionLinked(session: WhatsappSessionView): boolean {
    return (
      session.status === 'connected' ||
      session.status === 'connecting' ||
      !!session.phone_number
    );
  }

  useQuickResponse(text: string): void {
    this.composerForm.patchValue({ text });
  }

  ngOnInit(): void {
    this.loadAllData();

    merge(this.refresh$, this.refreshUsers$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAllData());
  }

  private loadAllData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.whatsappService
      .getOverview()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.sessions.set(overview.sessions);
          this.contacts.set(overview.contacts ?? []);

          if (!this.currentSession() && overview.sessions.length > 0) {
            this.selectSession(overview.sessions[0]);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los datos de WhatsApp.');
        },
      });

    this.userService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
        },
      });
  }

  selectSession(session: WhatsappSessionView): void {
    this.selectedSessionId = session.id;
    this.selectedChatId = null;
    this.currentSession.set(session);
    this.currentChat.set(null);
    this.currentContact.set(null);
    this.messages.set([]);

    this.whatsappService
      .getOverview(session.id, this.selectedChatId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.chats.set(overview.chats ?? []);
          this.contacts.set(overview.contacts ?? []);

          if (overview.active_chat_id) {
            const activeChat = (overview.chats ?? []).find((chat) => chat.id === overview.active_chat_id) ?? null;
            if (activeChat) {
              this.currentChat.set(activeChat);
              this.currentContact.set(activeChat.client ? { client: activeChat.client, linked_chat_id: activeChat.id } : null);
            }
          }

          this.messages.set(overview.messages ?? []);

          if (overview.active_chat_id) {
            this.loadMonthlyMessageHistory(session.id, overview.active_chat_id);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los chats y contactos.');
        },
      });
  }

  selectChat(chat: WhatsappChatView): void {
    this.selectedChatId = chat.id;
    this.currentChat.set(chat);
    this.currentContact.set(chat.client ? { client: chat.client, linked_chat_id: chat.id } : null);

    if (!chat.id) return;

    this.whatsappService
      .getMessageHistory(this.currentSession()!.id, {
        chatId: chat.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.messages.set(history.messages ?? []);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los mensajes.');
        },
      });
  }

  selectClientContact(contact: WhatsappClientContactView): void {
    this.currentContact.set(contact);
    this.messages.set([]);

    if (contact.linked_chat_id) {
      const linkedChat = this.chats().find((chat) => chat.id === contact.linked_chat_id);

      if (linkedChat && this.doesChatMatchCurrentClientPhone(linkedChat, contact.client)) {
        this.selectChat(linkedChat);
        return;
      }
    }

    this.selectedChatId = null;
    this.currentChat.set(this.buildDraftChat(contact));
  }

  refresh(): void {
    this.refresh$.next();
  }

  openCreateSessionModal(): void {
    this.sessionForm.reset(DEFAULT_SESSION_FORM);
    this.showCreateSessionModal.set(true);
  }

  closeCreateSessionModal(): void {
    this.showCreateSessionModal.set(false);
  }

  openSessionSettingsModal(session: WhatsappSessionView): void {
    this.selectedSessionId = session.id;
    this.showSessionSettingsModal.set(true);
  }

  closeSessionSettingsModal(): void {
    this.showSessionSettingsModal.set(false);
  }

  createSession(): void {
    if (this.sessionForm.invalid) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.whatsappService
      .createSession(this.sessionForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.actionLoading.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.refresh();
          this.closeCreateSessionModal();
        },
        error: () => {
          this.errorMessage.set('No se pudo crear la sesión.');
        },
      });
  }

  connectSession(session: WhatsappSessionView): void {
    this.executeAction(this.whatsappService.connectSession(session.id), 'Solicitando QR...');
  }

  disconnectSession(session: WhatsappSessionView): void {
    this.executeAction(this.whatsappService.disconnectSession(session.id), 'Sesión desconectada.');
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
              this.selectedSessionId = null;
              this.currentSession.set(null);
            }
            this.confirmService.close();
          }
        );
      }
    );
  }

  updateSelectedSession(patch: UpsertWhatsappSessionPayload): void {
    if (!this.currentSession()) return;

    this.executeAction(
      this.whatsappService.updateSession(this.currentSession()!.id, patch),
      'Sesión actualizada.'
    );
  }

  sendMessage(): void {
    if (this.composerForm.invalid || !this.currentSession() || (!this.currentChat() && !this.currentContact())) return;

    const text = this.composerForm.value.text ?? '';
    const currentSession = this.currentSession()!;
    const currentChat = this.currentChat();
    const currentContact = this.currentContact();

    const request$ = currentContact && this.shouldSendThroughClientEndpoint(currentChat, currentContact)
      ? this.whatsappService.sendMessageToClient(currentSession.id, currentContact.client.id, text)
      : currentChat?.id
        ? this.whatsappService.sendMessage(currentSession.id, currentChat.id, text)
        : currentContact
        ? this.whatsappService.sendMessageToClient(currentSession.id, currentContact.client.id, text)
        : null;

    if (!request$) {
      return;
    }

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result?.chat) {
            this.selectedChatId = result.chat.id;
            this.currentChat.set(result.chat);
            this.chats.set(this.upsertChatInList(this.chats(), result.chat));
            this.currentContact.set(result.chat.client ? { client: result.chat.client, linked_chat_id: result.chat.id } : this.currentContact());
          }

          if (this.currentSession() && this.currentChat()) {
            this.loadMonthlyMessageHistory(this.currentSession()!.id, this.currentChat()!.id);
          }

          this.composerForm.reset();
        },
        error: () => {
          this.errorMessage.set('No se pudo enviar el mensaje.');
        },
      });
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '', unreadOnly: false });
  }

  trackBySession(_: number, session: WhatsappSessionView): string {
    return session.id;
  }

  trackByChat(_: number, chat: WhatsappChatView): string {
    return chat.id || '';
  }

  trackByContact(_: number, contact: WhatsappClientContactView): string {
    return contact.client.id;
  }

  private buildDraftChat(contact: WhatsappClientContactView): WhatsappChatView {
    return {
      id: '',
      session_id: this.currentSession()?.id ?? '',
      remote_jid: this.buildRemoteJid(contact.client.phone),
      display_name: contact.client.full_name,
      phone_number: contact.client.phone,
      chat_type: 'contacto',
      is_group: false,
      is_status: false,
      unread_count: 0,
      last_message_text: 'Sin mensajes',
      last_message_direction: null,
      last_message_at: null,
      metadata: { is_client_contact: true },
      client: contact.client,
    };
  }

  private buildRemoteJid(phone: string | null | undefined): string {
    const digits = (phone ?? '').replace(/\D+/g, '');
    return digits ? `${digits}@s.whatsapp.net` : '';
  }

  private shouldSendThroughClientEndpoint(
    currentChat: WhatsappChatView | null,
    currentContact: WhatsappClientContactView
  ): boolean {
    if (!currentChat?.id) {
      return true;
    }

    if (!currentChat.client?.id) {
      return true;
    }

    return !this.doesChatMatchCurrentClientPhone(currentChat, currentContact.client);
  }

  private doesChatMatchCurrentClientPhone(chat: WhatsappChatView, client: WhatsappClientSummary): boolean {
    const chatPhone = this.normalizePhone(chat.phone_number || chat.remote_jid);
    const clientPhone = this.normalizePhone(client.phone);

    if (!chatPhone || !clientPhone) {
      return false;
    }

    return chatPhone === clientPhone || chatPhone.endsWith(clientPhone) || clientPhone.endsWith(chatPhone);
  }

  private normalizePhone(value: string | null | undefined): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  trackByMessage(_: number, message: WhatsappMessageView): string {
    return message.id;
  }

  private upsertChatInList(chats: WhatsappChatView[], updatedChat: WhatsappChatView): WhatsappChatView[] {
    const existingIndex = chats.findIndex((chat) => chat.id === updatedChat.id);

    if (existingIndex === -1) {
      return [updatedChat, ...chats];
    }

    return chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
  }

  private executeAction(
    action$: Observable<any>,
    successMessage?: string,
    onSuccess?: () => void
  ): void {
    this.actionLoading.set(true);
    this.errorMessage.set(null);

    action$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.actionLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.refresh();
          if (successMessage) {
            this.errorMessage.set(null);
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

  private loadMonthlyMessageHistory(sessionId: string, chatId: string): void {
    this.whatsappService
      .getMessageHistory(sessionId, {
        chatId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.messages.set(history.messages ?? []);
        },
        error: () => {
          this.errorMessage.set('No se pudo recuperar el historial del ultimo mes.');
        },
      });
  }
}
