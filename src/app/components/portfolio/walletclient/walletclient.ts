import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { PortfolioClientBracketInterface, PortfolioClientInterface } from '../../../interfaces/portfolio.interface';
import { PortfolioService } from '../../../services/portfolio.service';
import { AuthService } from '../../../services/auth.service';
import { BracketService } from '../../../services/bracket.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { SharedModule } from '../../../shared/shared.module';
import { CLIENT_DETAIL_ROUTE } from '../../../shared/constants';
interface WalletCardView {
  key: string;
  clientId: string;
  contractId: string | null;
  blockLabel: string;
  lotLabel: string;
  clientName: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  province: string;
  department: string;
  assignedUserId: string | null;
  assignedUserName: string;
  contractStatus: string;
  clientStatus: string;
  lotStatus: string;
  saleType: string;
  totalAmount: number | null;
  pendingAmount: number;
  paidAmount: number;
  installmentCount: number;
  paidCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  currentBracket?: PortfolioClientBracketInterface | null;
  currentBracketMode?: 'manual' | 'automatic' | null;
  brackets?: any[];
}

interface WalletGroupView {
  block: string;
  cards: WalletCardView[];
}

@Component({
  selector: 'app-walletclient',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './walletclient.html',
  styleUrl: './walletclient.scss',
})
export class Walletclient implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly portfolioService = inject(PortfolioService);
  private readonly authService = inject(AuthService);
  private readonly bracketService = inject(BracketService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  clients: PortfolioClientInterface[] = [];
  brackets: Array<{ id: string; name: string; is_active?: boolean }> = [];
  collectorClientIds = new Set<string>();
  loading = false;
  bracketsLoading = false;
  assigningClientId: string | null = null;
  bracketSavingClientId: string | null = null;
  error: string | null = null;
  feedback: string | null = null;
  selectedCardKey: string | null = null;
  selectedBracketMode: 'manual' | 'automatic' = 'automatic';
  selectedManualBracketId: string | null = null;

  readonly searchForm = this.fb.group({
    search: [''],
    block: [''],
    lot: [{value: '', disabled: true}],
    clientStatus: [''],
    lotStatus: [''],
  });

  ngOnInit(): void {
    this.loadClients();
    this.loadBrackets();

    this.searchForm.get('block')?.valueChanges.subscribe((blockValue) => {
      this.searchForm.get('lot')?.setValue('');
      if (blockValue) {
        this.searchForm.get('lot')?.enable();
      } else {
        this.searchForm.get('lot')?.disable();
      }
      this.ensureSelectedCard();
      this.cdr.markForCheck();
    });
  }

  get availableBlocks(): string[] {
    const blocks = new Set(this.cards.map(c => c.blockLabel).filter(b => b && b !== 'Sin MZ'));
    return Array.from(blocks).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  get availableLots(): string[] {
    const selectedBlock = this.searchForm.value.block;
    if (!selectedBlock) return [];
    
    const lots = new Set(
      this.cards
        .filter(c => c.blockLabel === selectedBlock)
        .map(c => c.lotLabel)
        .filter(l => l && l !== 'Sin lote')
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

  get canManageBracketMode(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return ['admin', 'super_collector'].includes(userRole);
  }

  get selectedCardCanEditBracket(): boolean {
    return this.canManageBracketMode && !!this.selectedCard;
  }

  get cards(): WalletCardView[] {
    return this.clients
      .filter((client) => !this.collectorClientIds.has(client.id))
      .flatMap((client) => {
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
        assignedUserId: client.assignedUserId,
        assignedUserName: client.assignedUserName || 'Sin asignar',
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
        currentBracket: client.currentBracket ?? null,
        currentBracketMode: client.currentBracketMode ?? null,
        brackets: client.brackets ?? [],
      }));
    });
  }

  get filteredGroups(): WalletGroupView[] {
    const groups = new Map<string, WalletCardView[]>();

    for (const card of this.filteredCards) {
      const key = card.blockLabel;
      const current = groups.get(key) ?? [];
      current.push(card);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([block, cards]) => ({
        block,
        cards: [...cards].sort((left, right) => left.lotLabel.localeCompare(right.lotLabel)),
      }))
      .sort((left, right) => left.block.localeCompare(right.block));
  }

  get filteredCards(): WalletCardView[] {
    const search = this.searchForm.value.search?.trim().toLowerCase() ?? '';
    const blockFilter = this.searchForm.value.block;
    const lotFilter = this.searchForm.value.lot;
    const clientStatusFilter = this.searchForm.value.clientStatus;
    const lotStatusFilter = this.searchForm.value.lotStatus;

    let filteredCards = this.cards;

    if (search) {
      filteredCards = filteredCards.filter((card) =>
        [
          card.clientName,
          card.dni,
          card.lotLabel,
          card.blockLabel,
          card.assignedUserName,
          card.contractStatus,
          card.clientStatus,
          card.lotStatus,
          card.saleType,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    }

    if (blockFilter) {
      filteredCards = filteredCards.filter(card => card.blockLabel === blockFilter);
    }

    if (lotFilter) {
      filteredCards = filteredCards.filter(card => card.lotLabel === lotFilter);
    }

    if (clientStatusFilter) {
      filteredCards = filteredCards.filter((card) => card.clientStatus === clientStatusFilter);
    }

    if (lotStatusFilter) {
      filteredCards = filteredCards.filter((card) => card.lotStatus === lotStatusFilter);
    }

    return filteredCards;
  }

  get selectedCard(): WalletCardView | null {
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
    this.cdr.markForCheck();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '', block: '', lot: '', clientStatus: '', lotStatus: '' });
    this.searchForm.get('lot')?.disable();
    this.ensureSelectedCard();
    this.cdr.markForCheck();
  }

  selectCard(cardKey: string): void {
    this.selectedCardKey = cardKey;
    this.syncSelectedBracketEditor();
    this.cdr.markForCheck();
  }

  isSelected(cardKey: string): boolean {
    return this.selectedCard?.key === cardKey;
  }

  getPaymentSummary(card: WalletCardView): string {
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

  getPrimaryBracketName(card: WalletCardView): string {
    return card.currentBracket?.name ?? 'Normal / Sin tramo';
  }

  getBracketModeLabel(card: WalletCardView): string {
    return card.currentBracketMode === 'manual' ? 'Manual' : 'Automatico';
  }

  getCurrentBracketModeLabel(card: WalletCardView): string {
    return this.getBracketModeLabel(card);
  }

  getPrimaryBracketStyle(card: WalletCardView): Record<string, string> {
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

  getRemainingInstallments(card: WalletCardView): number {
    return Math.max(card.installmentCount - card.paidCount - card.overdueCount, 0);
  }

  getLotStatusLabel(card: WalletCardView): string {
    return card.lotStatus || 'Sin estado lote';
  }

  getClientStatusLabel(card: WalletCardView): string {
    return card.clientStatus || 'Sin estado cliente';
  }

  getInstallmentPercentage(count: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return (count / total) * 100;
  }

  addToMyWallet(card: WalletCardView): void {
    if (this.assigningClientId === card.clientId) {
      return;
    }

    this.assigningClientId = card.clientId;
    this.error = null;
    this.feedback = null;

    this.portfolioService
      .assignToMyWallet(card.clientId, {
        bracketMode: card.currentBracketMode === 'manual' ? 'manual' : 'automatic',
        bracketId: card.currentBracketMode === 'manual' ? (card.currentBracket?.id ?? null) : null,
      })
      .pipe(finalize(() => {
        this.assigningClientId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (client) => {
          this.collectorClientIds = new Set([...this.collectorClientIds, client.id]);
          this.clients = this.clients.filter((existingClient) => existingClient.id !== client.id);
          this.upsertClient(client);
          this.snackbarService.success(
            `${client.fullName || 'El cliente'} fue agregado a tu cartera correctamente.`
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo agregar el cliente a tu cartera.';
          this.cdr.markForCheck();
        },
      });
  }

  isAssigning(clientId: string): boolean {
    return this.assigningClientId === clientId;
  }

  isSavingBracket(clientId: string): boolean {
    return this.bracketSavingClientId === clientId;
  }

  onManualBracketChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.selectedManualBracketId = value;
  }

  saveSelectedBracketMode(card: WalletCardView): void {
    if (!this.canManageBracketMode || this.isSavingBracket(card.clientId)) {
      return;
    }

    if (this.selectedBracketMode === 'manual' && !this.selectedManualBracketId) {
      this.error = 'Selecciona un tramo antes de guardar.';
      this.feedback = null;
      this.cdr.markForCheck();
      return;
    }

    this.bracketSavingClientId = card.clientId;
    this.error = null;
    this.feedback = null;

    this.portfolioService
      .updateClientBracket({
        clientId: card.clientId,
        bracketMode: this.selectedBracketMode,
        bracketId: this.selectedBracketMode === 'manual' ? this.selectedManualBracketId : null,
      })
      .pipe(finalize(() => {
        this.bracketSavingClientId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.upsertClient(updatedClient);
          this.syncSelectedBracketEditor();
          this.feedback = this.selectedBracketMode === 'manual'
            ? 'Tramo del cliente actualizado correctamente y fijado de forma manual.'
            : 'El tramo del cliente volvió a modo automatico.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo actualizar el tramo del cliente.';
          this.cdr.markForCheck();
        },
      });
  }

  trackByBlock(_: number, group: WalletGroupView): string {
    return group.block;
  }

  trackByCard(_: number, card: WalletCardView): string {
    return card.key;
  }

  private loadClients(): void {
    this.loading = true;
    this.error = null;
    this.feedback = null;

    forkJoin({
      clients: this.portfolioService.getAll(),
      collectorWallet: this.portfolioService.getCollectorWallet().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: ({ clients, collectorWallet }) => {
          this.collectorClientIds = new Set(collectorWallet.map((client) => client.id));
          this.clients = clients;
          this.ensureSelectedCard();
          this.syncSelectedBracketEditor();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo cargar la cartera general.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadBrackets(): void {
    this.bracketsLoading = true;

    this.bracketService.getAll()
      .pipe(finalize(() => {
        this.bracketsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (brackets) => {
          this.brackets = brackets.filter((bracket) => bracket.is_active);
          this.syncSelectedBracketEditor();
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudieron cargar los tramos disponibles.';
          this.cdr.markForCheck();
        },
      });
  }

  private upsertClient(updatedClient: PortfolioClientInterface): void {
    const index = this.clients.findIndex((client) => client.id === updatedClient.id);

    if (index === -1) {
      this.clients = [updatedClient, ...this.clients];
      return;
    }

    const nextClients = [...this.clients];
    nextClients[index] = updatedClient;
    this.clients = nextClients;
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

    this.syncSelectedBracketEditor();
  }

  goToClientDetail(card: WalletCardView): void {
    this.router.navigate([CLIENT_DETAIL_ROUTE, card.clientId]);
  }

  private buildEmptyCard(client: PortfolioClientInterface): WalletCardView {
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
      assignedUserId: client.assignedUserId,
      assignedUserName: client.assignedUserName || 'Sin asignar',
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
      currentBracket: client.currentBracket ?? null,
      currentBracketMode: client.currentBracketMode ?? null,
      brackets: client.brackets ?? [],
    };
  }

  private syncSelectedBracketEditor(): void {
    const selectedCard = this.selectedCard;

    if (!selectedCard) {
      this.selectedBracketMode = 'automatic';
      this.selectedManualBracketId = null;
      return;
    }

    this.selectedBracketMode = selectedCard.currentBracketMode === 'manual' ? 'manual' : 'automatic';
    this.selectedManualBracketId = this.selectedBracketMode === 'manual'
      ? selectedCard.currentBracket?.id ?? null
      : null;
  }
}
