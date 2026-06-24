import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  PortfolioClientActionHistoryInterface,
  PortfolioClientActionTypeInterface,
  PortfolioClientInterface,
  CollectorUserInterface,
} from 'src/app/interfaces/portfolio.interface';
import { PortfolioAlertFiltersInterface } from 'src/app/interfaces/portfolio-alert.interface';
import { PortfolioService } from 'src/app/services/portfolio.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { CollectorCardView, CollectorGroupView } from 'src/app/interfaces/collector-card-view.interface';
import { Router } from '@angular/router';
import { CLIENT_DETAIL_ROUTE } from 'src/app/shared/constants';
import { AuthService } from 'src/app/services/auth.service';
import { BracketService } from 'src/app/services/bracket.service';
import { BracketModel } from 'src/app/models/bracket.model';
import { ConfirmActionModalService } from 'src/app/shared/components/confirm-action-modal/confirm-action-modal.service';
import { PortfolioAlertsComponent } from '../portfolio-alerts/portfolio-alerts';

@Component({
  selector: 'app-portfoliocollerctor',
  standalone: true,
  imports: [SharedModule, PortfolioAlertsComponent],
  templateUrl: './portfoliocollerctor.html',
  styleUrl: './portfoliocollerctor.scss',
})
export class Portfoliocollerctor implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly portfolioService = inject(PortfolioService);
  private readonly bracketService = inject(BracketService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmActionModalService);
  private readonly actionHistoryCache = new Map<string, PortfolioClientActionHistoryInterface[]>();

  clients: PortfolioClientInterface[] = [];
  collectors: CollectorUserInterface[] = [];
  brackets: BracketModel[] = [];
  selectedCollectorId: string | null = null;
  actionCatalog: PortfolioClientActionTypeInterface[] = [];
  historyLoading = false;
  historyError: string | null = null;
  catalogLoading = false;
  bracketsLoading = false;
  actionSaving = false;
  actionFeedback: string | null = null;
  clientFeedback: string | null = null;
  loading = false;
  collectorsLoading = false;
  error: string | null = null;
  selectedCardKey: string | null = null;
  bracketModeSaving = false;
  selectedBracketMode: 'manual' | 'automatic' = 'automatic';
  selectedManualBracketId: string | null = null;

  get isAdmin(): boolean {
    return this.currentUserRole === 'admin';
  }

  get canAccessOwnWallet(): boolean {
    return !this.isAdmin;
  }

  get canManageCollectors(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return ['admin', 'super_collector'].includes(userRole);
  }

  get canManageBracketMode(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return ['admin', 'super_collector'].includes(userRole);
  }

  get selectedCollectorName(): string | null {
    if (!this.selectedCollectorId) return null;
    const collector = this.collectors.find((c) => c.id === this.selectedCollectorId);
    return collector?.full_name ?? null;
  }

  get pageTitle(): string {
    if (this.selectedCollectorName) {
      return `Cartera de ${this.selectedCollectorName}`;
    }
    return this.canAccessOwnWallet ? 'Mi cartera asignada' : 'Gestionar carteras';
  }

  get pageDescription(): string {
    if (this.selectedCollectorName) {
      return `Consulta los clientes del cobrador ${this.selectedCollectorName}, agrupados por manzana y lote.`;
    }
    return this.canAccessOwnWallet
      ? 'Consulta los clientes relacionados al usuario autenticado, agrupados por manzana y lote.'
      : 'Selecciona un cobrador para revisar y administrar la cartera asignada.';
  }

  get canUnassignSelectedClient(): boolean {
    return !!this.selectedCard;
  }

  get unassignButtonLabel(): string {
    return this.selectedCollectorId || !this.canAccessOwnWallet ? 'Desvincular' : 'Quitar de mi cartera';
  }

  get collectorSelectorDefaultLabel(): string {
    return this.canAccessOwnWallet ? '📂 Mi cartera' : '📂 Seleccionar cartera';
  }

  get walletAlertsAssignedUserId(): string | null {
    if (this.selectedCollectorId) {
      return this.selectedCollectorId;
    }

    return this.canAccessOwnWallet ? this.currentUserId : null;
  }

  get walletAlertsContextReady(): boolean {
    return !!this.walletAlertsAssignedUserId;
  }

  get walletAlertsEmptyMessage(): string {
    return this.canAccessOwnWallet
      ? 'No se pudo identificar la cartera activa para mostrar alertas.'
      : 'Selecciona un cobrador para visualizar alertas de su cartera.';
  }

  get walletAlertFilters(): PortfolioAlertFiltersInterface {
    return {
      search: this.normalizeFilterValue(this.searchForm.value.search),
      block: this.normalizeFilterValue(this.searchForm.value.block),
      lot: this.normalizeFilterValue(this.searchForm.value.lot),
      clientStatus: this.normalizeFilterValue(this.searchForm.value.clientStatus),
      lotStatus: this.normalizeFilterValue(this.searchForm.value.lotStatus),
    };
  }

  get searchLabel(): string {
    if (this.selectedCollectorName) {
      return `Buscar en la cartera de ${this.selectedCollectorName}`;
    }

    return this.canAccessOwnWallet ? 'Buscar en mi cartera' : 'Buscar en una cartera seleccionada';
  }

  get loadingMessage(): string {
    if (this.selectedCollectorName) {
      return `Cargando la cartera de ${this.selectedCollectorName}...`;
    }

    return this.canAccessOwnWallet ? 'Cargando mi cartera...' : 'Cargando cartera seleccionada...';
  }

  get emptyStateMessage(): string {
    if (this.selectedCollectorName) {
      return 'Este cobrador no tiene clientes asignados.';
    }

    return this.canAccessOwnWallet
      ? 'No hay clientes asignados para mostrar.'
      : 'Selecciona un cobrador para gestionar su cartera.';
  }

  get unassignButtonTitle(): string {
    return this.selectedCollectorId || !this.canAccessOwnWallet
      ? 'Desvincular cliente del cobrador'
      : 'Quitar cliente de mi cartera';
  }

  readonly searchForm = this.fb.group({
    search: [''],
    block: [''],
    lot: [''],
    clientStatus: [''],
    lotStatus: [''],
  });

  readonly actionForm = this.fb.group({
    actionTypeId: ['', [Validators.required]],
    observation: ['', [Validators.maxLength(500)]],
    actionDate: [''],
  });

  ngOnInit(): void {
    this.loadCollectorsIfNeeded();
    this.loadWallet();
    this.loadActionCatalog();
    this.loadBrackets();

    this.searchForm.get('block')?.valueChanges.subscribe(() => {
      this.searchForm.get('lot')?.setValue('');
      this.ensureSelectedCard();
      this.syncSelectedClientState();
      this.cdr.markForCheck();
    });
  }

  get availableBlocks(): string[] {
    const blocks = new Set(this.cards.map((card) => card.blockLabel).filter((block) => block && block !== 'Sin MZ'));
    return Array.from(blocks).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  get availableLots(): string[] {
    const selectedBlock = this.searchForm.value.block;
    if (!selectedBlock) return [];

    const lots = new Set(
      this.cards
        .filter((card) => card.blockLabel === selectedBlock)
        .map((card) => card.lotLabel)
        .filter((lot) => lot && lot !== 'Sin lote')
    );

    return Array.from(lots).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  get availableClientStatuses(): string[] {
    const statuses = new Set(
      this.cards
        .map((card) => card.clientStatus)
        .filter((status): status is string => !!status && status !== 'Sin estado cliente')
    );

    return Array.from(statuses).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get availableLotStatuses(): string[] {
    const statuses = new Set(
      this.cards
        .map((card) => card.lotStatus)
        .filter((status): status is string => !!status && status !== 'Sin estado lote')
    );

    return Array.from(statuses).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get totalClients(): number {
    return this.clients.length;
  }

  get totalContracts(): number {
    return this.cards.length;
  }

  get cards(): CollectorCardView[] {
    return this.clients.flatMap((client) => {
      if (!client.contracts.length) {
        return [this.buildEmptyCard(client)];
      }

      return client.contracts.map((contract) => ({
        key: `${client.id}-${contract.id}`,
        clientId: client.id,
        contractId: contract.id,
        blockLabel: contract.block || 'Sin MZ',
        lotLabel: contract.lot || 'Sin lote',
        clientName: client.fullName || 'Sin nombre',
        dni: client.dni || '-',
        phone: client.phone || '-',
        email: client.email || '-',
        address: client.address || '-',
        district: client.district || '-',
        province: client.province || '-',
        department: client.department || '-',
        contractStatus: contract.status || 'Sin estado',
        clientStatus: client.status || 'Sin estado cliente',
        lotStatus: contract.lotStatus || 'Sin estado lote',
        saleType: contract.saleType || 'Sin tipo de venta',
        totalAmount: contract.totalAmount,
        pendingAmount: contract.summary.pendingAmount ?? 0,
        paidAmount: contract.summary.paidAmount ?? 0,
        installmentCount: contract.summary.installmentCount ?? 0,
        paidCount: contract.summary.paidCount ?? 0,
        overdueCount: contract.summary.overdueCount ?? 0,
        nextDueDate: contract.summary.nextDueDate,
        latestAction: client.latestAction ?? null,
        hasPendingImportUpdates: !!client.hasPendingImportUpdates,
        pendingImportUpdatesCount: client.pendingImportUpdatesCount ?? 0,
        currentBracket: client.currentBracket ?? null,
        currentBracketMode: client.currentBracketMode ?? null,
        brackets: client.brackets ?? [],
      }));
    });
  }

  get filteredGroups(): CollectorGroupView[] {
    const groups = new Map<string, CollectorCardView[]>();

    for (const card of this.filteredCards) {
      const current = groups.get(card.blockLabel) ?? [];
      current.push(card);
      groups.set(card.blockLabel, current);
    }

    return Array.from(groups.entries())
      .map(([block, cards]) => ({
        block,
        cards: [...cards].sort((left, right) => left.lotLabel.localeCompare(right.lotLabel)),
      }))
      .sort((left, right) => left.block.localeCompare(right.block));
  }

  get filteredCards(): CollectorCardView[] {
    const search = this.searchForm.value.search?.trim().toLowerCase() ?? '';
    const blockFilter = this.searchForm.value.block;
    const lotFilter = this.searchForm.value.lot;
    const clientStatusFilter = this.searchForm.value.clientStatus;
    const lotStatusFilter = this.searchForm.value.lotStatus;

    let filteredCards = search
      ? this.cards.filter((card) =>
          [
            card.clientName,
            card.dni,
            card.lotLabel,
            card.blockLabel,
            card.contractStatus,
            card.clientStatus,
            card.lotStatus,
            card.saleType,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search)
        )
      : this.cards;

    if (blockFilter) {
      filteredCards = filteredCards.filter((card) => card.blockLabel === blockFilter);
    }

    if (lotFilter) {
      filteredCards = filteredCards.filter((card) => card.lotLabel === lotFilter);
    }

    if (clientStatusFilter) {
      filteredCards = filteredCards.filter((card) => card.clientStatus === clientStatusFilter);
    }

    if (lotStatusFilter) {
      filteredCards = filteredCards.filter((card) => card.lotStatus === lotStatusFilter);
    }

    return filteredCards;
  }

  get selectedCard(): CollectorCardView | null {
    if (this.filteredCards.length === 0) {
      return null;
    }

    if (!this.selectedCardKey) {
      return this.filteredCards[0];
    }

    return this.filteredCards.find((card) => card.key === this.selectedCardKey) ?? this.filteredCards[0];
  }

  search(): void {
    this.ensureSelectedCard();
    this.syncSelectedClientState();
    this.cdr.markForCheck();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '', block: '', lot: '', clientStatus: '', lotStatus: '' });
    this.ensureSelectedCard();
    this.syncSelectedClientState();
    this.cdr.markForCheck();
  }

  selectCard(cardKey: string): void {
    this.selectedCardKey = cardKey;
    this.syncSelectedClientState();
    this.cdr.markForCheck();
  }

  isSelected(cardKey: string): boolean {
    return this.selectedCard?.key === cardKey;
  }

  getPrimaryBracketName(card: CollectorCardView): string {
    return card.currentBracket?.name ?? 'Normal / Sin tramo';
  }

  getCurrentBracketModeLabel(card: CollectorCardView): string {
    return card.currentBracketMode === 'manual' ? 'Manual' : 'Automático';
  }

  get currentHistory(): PortfolioClientActionHistoryInterface[] {
    const clientId = this.selectedCard?.clientId;

    if (!clientId) {
      return [];
    }

    return this.actionHistoryCache.get(clientId) ?? [];
  }

  get selectedClientHasPhone(): boolean {
    const phone = this.selectedCard?.phone;
    return !!phone && phone !== '-';
  }

  get selectedClientHasEmail(): boolean {
    const email = this.selectedCard?.email;
    return !!email && email !== '-';
  }

  getPrimaryBracketStyle(card: CollectorCardView): Record<string, string> {
    const color = card.currentBracket?.color;

    if (!color) {
      return {
        background: '#eef2ff',
        color: '#4338ca',
        border: '1px solid #c7d2fe',
      };
    }

    return {
      background: `${color}20`,
      color,
      border: `1px solid ${color}55`,
    };
  }

  getRemainingInstallments(card: CollectorCardView): number {
    return Math.max(card.installmentCount - card.paidCount - card.overdueCount, 0);
  }

  getInstallmentPercentage(count: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return (count / total) * 100;
  }

  getLotStatusLabel(card: CollectorCardView): string {
    return card.lotStatus || 'Sin estado lote';
  }

  getClientStatusLabel(card: CollectorCardView): string {
    return card.clientStatus || 'Sin estado cliente';
  }

  getPaymentSummary(card: CollectorCardView): string {
    if (card.installmentCount <= 0) {
      return 'Sin cronograma registrado';
    }

    const segments: string[] = [];

    if (card.paidCount > 0) {
      segments.push(`${card.paidCount} pagada(s)`);
    }

    if (card.overdueCount > 0) {
      segments.push(`${card.overdueCount} vencida(s)`);
    }

    if (card.paidCount === 0 && card.overdueCount === 0) {
      segments.push('Al dia');
    }

    segments.push(`${card.installmentCount} cuota(s)`);

    return segments.join(' · ');
  }

  getLatestActionLabel(card: CollectorCardView): string {
    return card.latestAction?.actionTypeName?.trim() || 'Sin accion registrada';
  }

  getLatestActionDate(card: CollectorCardView): string {
    return this.formatDateTime(card.latestAction?.actionDate);
  }

  getPendingUpdatesLabel(card: CollectorCardView): string {
    if (!card.hasPendingImportUpdates) {
      return 'Sin actualizaciones';
    }

    const count = card.pendingImportUpdatesCount || 0;
    return `${count} actualizacion${count === 1 ? '' : 'es'} pendiente${count === 1 ? '' : 's'}`;
  }

  getActionTypeState(actionTypeId: string): boolean {
    return this.currentHistory.some((item) => item.actionTypeId === actionTypeId);
  }

  getActionTypeLastDate(actionTypeId: string): string {
    const history = this.currentHistory.find((item) => item.actionTypeId === actionTypeId);
    return this.formatDateTime(history?.actionDate);
  }

  isActionTypeAvailable(actionTypeId: string): boolean {
    return !this.getActionTypeState(actionTypeId);
  }

  getWhatsappUrl(card: CollectorCardView): string | null {
    const rawPhone = card.phone?.trim();

    if (!rawPhone || rawPhone === '-') {
      return null;
    }

    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) {
      return null;
    }

    const phone = digits.length === 9 ? `51${digits}` : digits;
    return `https://wa.me/${phone}`;
  }

  getMailUrl(card: CollectorCardView): string | null {
    const email = card.email?.trim();

    if (!email || email === '-') {
      return null;
    }

    return `mailto:${email}`;
  }

  registerAction(): void {
    const selectedCard = this.selectedCard;

    if (!selectedCard) {
      return;
    }

    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    this.actionSaving = true;
    this.actionFeedback = null;

    const formValue = this.actionForm.getRawValue();
    const actionTypeId = formValue.actionTypeId ?? '';

    if (!this.isActionTypeAvailable(actionTypeId)) {
      this.actionFeedback = 'Esta accion ya fue registrada para este cliente.';
      this.cdr.markForCheck();
      return;
    }

    this.portfolioService
      .registerClientAction({
        clientId: selectedCard.clientId,
        actionTypeId,
        observation: formValue.observation?.trim() || null,
        actionDate: formValue.actionDate || null,
      })
      .pipe(finalize(() => {
        this.actionSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (historyItem) => {
          const existingHistory = this.actionHistoryCache.get(selectedCard.clientId) ?? [];
          this.actionHistoryCache.set(selectedCard.clientId, [historyItem, ...existingHistory]);
          this.updateClientLatestAction(selectedCard.clientId, historyItem);
          this.actionFeedback = 'Accion registrada correctamente.';
          this.actionForm.patchValue({
            actionTypeId: '',
            observation: '',
            actionDate: '',
          });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.actionFeedback = err?.error?.message ?? 'No se pudo registrar la accion.';
          this.cdr.markForCheck();
        },
      });
  }

  saveSelectedBracketMode(): void {
    const selectedCard = this.selectedCard;

    if (!selectedCard || this.bracketModeSaving) {
      return;
    }

    if (this.selectedBracketMode === 'manual' && !this.selectedManualBracketId) {
      this.clientFeedback = 'Selecciona un tramo manual antes de guardar.';
      this.cdr.markForCheck();
      return;
    }

    this.bracketModeSaving = true;
    this.clientFeedback = null;

    this.portfolioService
      .updateClientBracket({
        clientId: selectedCard.clientId,
        bracketMode: this.selectedBracketMode,
        bracketId: this.selectedBracketMode === 'manual' ? this.selectedManualBracketId : null,
      })
      .pipe(finalize(() => {
        this.bracketModeSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.replaceClient(updatedClient);
          this.syncBracketEditorState();
          this.clientFeedback = 'Tramo del cliente actualizado correctamente.';
        },
        error: (err) => {
          this.clientFeedback = err?.error?.message ?? 'No se pudo actualizar el tramo del cliente.';
        },
      });
  }

  unassignClient(): void {
    const selectedCard = this.selectedCard;

    if (!selectedCard) {
      return;
    }

    const title = this.selectedCollectorId ? 'Desvincular cliente' : 'Quitar cliente de cartera';
    const message = this.selectedCollectorId
      ? `Se desvinculará a ${selectedCard.clientName} de la cartera seleccionada.`
      : `Se quitará a ${selectedCard.clientName} de tu cartera.`;
    const details = 'El cliente no será eliminado del sistema. Solo se retirará de la cartera actual.';
    const confirmText = this.unassignButtonLabel;

    this.confirmService.open(
      { title, message, details, confirmText, variant: 'danger' },
      () => this.performUnassign(selectedCard)
    );
  }

  private performUnassign(selectedCard: CollectorCardView): void {
    this.clientFeedback = null;
    this.error = null;

    this.portfolioService
      .unassignClientFromCollector(selectedCard.clientId)
      .pipe(finalize(() => {
        this.confirmService.close();
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.clients = this.clients.filter((client) => client.id !== updatedClient.id);
          this.selectedCardKey = null;
          this.ensureSelectedCard();
          this.syncSelectedClientState();
          this.clientFeedback = this.selectedCollectorId
            ? 'Cliente desvinculado del cobrador correctamente.'
            : 'Cliente quitado de tu cartera correctamente.';
          setTimeout(() => {
            this.clientFeedback = null;
            this.cdr.markForCheck();
          }, 3000);
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudo desvincular el cliente.';
        },
      });
  }

  trackByBlock(_: number, group: CollectorGroupView): string {
    return group.block;
  }

  trackByCard(_: number, card: CollectorCardView): string {
    return card.key;
  }

  private loadWallet(): void {
    if (!this.selectedCollectorId && !this.canAccessOwnWallet) {
      this.loading = false;
      this.error = null;
      this.clients = [];
      this.selectedCardKey = null;
      this.syncSelectedClientState();
      this.syncBracketEditorState();
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = null;

    const request$ = this.selectedCollectorId
      ? this.portfolioService.getAll(this.selectedCollectorId)
      : this.portfolioService.getCollectorWallet();

    request$
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (clients) => {
          this.clients = clients;
          this.ensureSelectedCard();
          this.syncSelectedClientState();
          this.syncBracketEditorState();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo cargar la cartera.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadCollectorsIfNeeded(): void {
    if (!this.canManageCollectors) {
      return;
    }

    this.collectorsLoading = true;
    this.portfolioService
      .getCollectors()
      .pipe(finalize(() => {
        this.collectorsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (collectors) => {
          this.collectors = collectors;
          this.cdr.markForCheck();
        },
        error: () => {
          this.collectors = [];
          this.cdr.markForCheck();
        },
      });
  }

  private loadBrackets(): void {
    this.bracketsLoading = true;

    this.bracketService
      .getAll()
      .pipe(finalize(() => {
        this.bracketsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (brackets) => {
          this.brackets = brackets
            .filter((bracket) => bracket.is_active)
            .map((bracket) => BracketModel.fromJson(bracket));
          this.syncBracketEditorState();
        },
        error: () => {
          this.brackets = [];
        },
      });
  }

  selectCollector(collectorId: string): void {
    this.selectedCollectorId = collectorId === '' ? null : collectorId;
    this.loadWallet();
  }

  private loadActionCatalog(): void {
    this.catalogLoading = true;

    this.portfolioService
      .getActionCatalog()
      .pipe(finalize(() => {
        this.catalogLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (catalog) => {
          this.actionCatalog = catalog;
          this.cdr.markForCheck();
        },
        error: () => {
          this.actionCatalog = [];
          this.cdr.markForCheck();
        },
      });
  }

  private syncSelectedClientState(): void {
    const selectedCard = this.selectedCard;

    this.syncBracketEditorState();

    if (!selectedCard) {
      return;
    }

    this.loadClientHistory(selectedCard.clientId);
  }

  private loadClientHistory(clientId: string): void {
    if (this.actionHistoryCache.has(clientId)) {
      this.historyError = null;
      return;
    }

    this.historyLoading = true;
    this.historyError = null;

    this.portfolioService
      .getClientActionHistory(clientId)
      .pipe(finalize(() => {
        this.historyLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (history) => {
          this.actionHistoryCache.set(clientId, history);
          this.historyError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.historyError = err?.error?.message ?? 'No se pudo cargar el historial de acciones.';
          this.cdr.markForCheck();
        },
      });
  }

  private ensureSelectedCard(): void {
    const visibleCards = this.filteredCards;

    if (visibleCards.length === 0) {
      this.selectedCardKey = null;
      return;
    }

    if (!this.selectedCardKey || !visibleCards.some((card) => card.key === this.selectedCardKey)) {
      this.selectedCardKey = visibleCards[0].key;
    }
  }

  private replaceClient(updatedClient: PortfolioClientInterface): void {
    this.clients = this.clients.map((client) => (client.id === updatedClient.id ? updatedClient : client));
    this.syncBracketEditorState();
  }

  private updateClientLatestAction(clientId: string, latestAction: PortfolioClientActionHistoryInterface): void {
    this.clients = this.clients.map((client) =>
      client.id === clientId
        ? {
            ...client,
            latestAction,
          }
        : client
    );
  }

  private getClientById(clientId: string): PortfolioClientInterface | null {
    return this.clients.find((client) => client.id === clientId) ?? null;
  }

  private syncBracketEditorState(): void {
    const selectedClient = this.selectedCard ? this.getClientById(this.selectedCard.clientId) : null;

    if (!selectedClient) {
      this.selectedBracketMode = 'automatic';
      this.selectedManualBracketId = null;
      return;
    }

    this.selectedBracketMode = selectedClient.currentBracketMode === 'manual' ? 'manual' : 'automatic';
    this.selectedManualBracketId = selectedClient.currentBracketMode === 'manual'
      ? selectedClient.currentBracket?.id ?? null
      : null;
  }

  goToClientDetail(card: CollectorCardView): void {
    const queryParams: any = { source: 'collector' };
    if (this.canManageCollectors && this.selectedCollectorId) {
      queryParams.source = 'admin';
      queryParams.collectorId = this.selectedCollectorId;
    }
    this.router.navigate([CLIENT_DETAIL_ROUTE, card.clientId], { queryParams });
  }

  focusClientFromAlert(clientId: string): void {
    if (!clientId) {
      return;
    }

    let targetCard = this.filteredCards.find((card) => card.clientId === clientId) ?? null;

    if (!targetCard) {
      this.resetSearch();
      targetCard = this.filteredCards.find((card) => card.clientId === clientId) ?? null;
    }

    if (!targetCard) {
      this.router.navigate([CLIENT_DETAIL_ROUTE, clientId], {
        queryParams: this.selectedCollectorId ? { source: 'admin', collectorId: this.selectedCollectorId } : { source: 'collector' },
      });
      return;
    }

    this.selectedCardKey = targetCard.key;
    this.syncSelectedClientState();
    this.cdr.markForCheck();
  }

  private get currentUserRole(): string {
    return this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
  }

  private get currentUserId(): string | null {
    return this.authService.getUser()?.id ?? null;
  }

  private normalizeFilterValue(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized !== '' ? normalized : null;
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private buildEmptyCard(client: PortfolioClientInterface): CollectorCardView {
    return {
      key: `${client.id}-no-contract`,
      clientId: client.id,
      contractId: null,
      blockLabel: 'Sin MZ',
      lotLabel: 'Sin lote',
      clientName: client.fullName || 'Sin nombre',
      dni: client.dni || '-',
      phone: client.phone || '-',
      email: client.email || '-',
      address: client.address || '-',
      district: client.district || '-',
      province: client.province || '-',
      department: client.department || '-',
      contractStatus: 'Sin contrato',
      clientStatus: client.status || 'Sin estado cliente',
      lotStatus: 'Sin estado lote',
      saleType: 'Sin tipo de venta',
      totalAmount: null,
      pendingAmount: 0,
      paidAmount: 0,
      installmentCount: 0,
      paidCount: 0,
      overdueCount: 0,
      nextDueDate: null,
      latestAction: client.latestAction ?? null,
      hasPendingImportUpdates: !!client.hasPendingImportUpdates,
      pendingImportUpdatesCount: client.pendingImportUpdatesCount ?? 0,
      currentBracket: client.currentBracket ?? null,
      currentBracketMode: client.currentBracketMode ?? null,
      brackets: client.brackets ?? [],
    };
  }
}
