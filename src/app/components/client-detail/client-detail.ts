import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  PortfolioClientActionHistoryInterface,
  PortfolioClientActionTypeInterface,
  PortfolioClientInterface,
  PortfolioContractSummaryInterface,
  PortfolioInstallmentInterface,
  PortfolioPendingImportItemInterface,
  PortfolioPendingImportResponseInterface,
} from '../../interfaces/portfolio.interface';
import { PortfolioService } from '../../services/portfolio.service';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../shared/shared.module';
import { MORO_DEFAULT_DAYS } from '../../shared/constants';

interface InstallmentView {
  id: string;
  number: number | null;
  installmentType: string | null;
  amount: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  paidAmount: number | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  importedStatus: string | null;
  paymentType: string | null;
  paymentMethod: string | null;
  paymentBank: string | null;
  paymentBankOrigin: string | null;
  status: string | null;
  pendingAmount: number;
  daysOverdue: number;
  isOverdue: boolean;
  isMora: boolean;
  isPaid: boolean;
  isPartial: boolean;
}

interface ContractView {
  id: string;
  lot: string | null;
  block: string | null;
  totalAmount: number | null;
  lotStatus: string | null;
  saleType: string | null;
  installments: InstallmentView[];
  summary: PortfolioContractSummaryInterface;
}

interface InstallmentEditContext {
  contractId: string;
  contractLot: string | null;
  contractBlock: string | null;
  installment: InstallmentView;
}

type InstallmentViewMode = 'blocks' | 'table';
type InstallmentFilter = 'all' | 'paid' | 'mora' | 'overdue' | 'pending';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
})
export class ClientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly portfolioService = inject(PortfolioService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  clientId: string | null = null;
  client: PortfolioClientInterface | null = null;
  source: 'general' | 'collector' | 'admin' = 'general';
  loading = false;
  error: string | null = null;
  historyLoading = false;
  historyError: string | null = null;
  catalogLoading = false;
  actionSaving = false;
  actionFeedback: string | null = null;
  pendingLoading = false;
  pendingSaving = false;
  pendingError: string | null = null;
  pendingFeedback: string | null = null;
  history: PortfolioClientActionHistoryInterface[] = [];
  actionCatalog: PortfolioClientActionTypeInterface[] = [];
  pendingUpdates: PortfolioPendingImportResponseInterface | null = null;
  installmentViewMode: InstallmentViewMode = 'blocks';
  installmentFilter: InstallmentFilter = 'all';
  showEditClientModal = false;
  showInstallmentModal = false;
  editingInstallmentContext: InstallmentEditContext | null = null;
  clientSaving = false;
  installmentSaving = false;
  clientModalFeedback: string | null = null;
  clientModalError: string | null = null;
  installmentModalFeedback: string | null = null;
  installmentModalError: string | null = null;
  detailFeedback: string | null = null;

  readonly actionForm = this.fb.group({
    actionTypeId: ['', [Validators.required]],
    observation: ['', [Validators.maxLength(500)]],
    actionDate: [''],
  });

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

  readonly installmentForm = this.fb.group({
    installmentType: ['', [Validators.maxLength(120)]],
    paymentDate: [''],
    paidAmount: [null as number | null, [Validators.min(0)]],
    importedStatus: ['', [Validators.maxLength(120)]],
    paymentType: ['', [Validators.maxLength(120)]],
    paymentChannel: ['', [Validators.maxLength(255)]],
    paymentReference: ['', [Validators.maxLength(255)]],
    paymentMethod: ['', [Validators.maxLength(120)]],
    paymentBank: ['', [Validators.maxLength(120)]],
    paymentBankOrigin: ['', [Validators.maxLength(120)]],
    status: ['', [Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.source = this.resolveSource(this.route.snapshot.queryParamMap.get('source'));
    this.installmentForm.controls.paymentType.valueChanges.subscribe(() => this.syncInstallmentDerivedFields());
    this.installmentForm.controls.paidAmount.valueChanges.subscribe(() => this.syncInstallmentDerivedFields());
    this.installmentForm.controls.paymentDate.valueChanges.subscribe(() => this.syncInstallmentDerivedFields());

    if (this.clientId) {
      this.loadClient();
      if (this.canManageActions) {
        this.loadActionCatalog();
        this.loadClientHistory(this.clientId);
        this.loadPendingUpdates(this.clientId);
      }
    } else {
      this.error = 'No se encontró el cliente.';
    }
  }

  get contractsView(): ContractView[] {
    if (!this.client) return [];
    return this.client.contracts.map((contract) => ({
      id: contract.id,
      lot: contract.lot,
      block: contract.block,
      totalAmount: contract.totalAmount,
      lotStatus: contract.lotStatus ?? null,
      saleType: contract.saleType ?? null,
      summary: contract.summary,
      installments: contract.installments.map((inst) => this.buildInstallmentView(inst)),
    }));
  }

  get totalContracts(): number {
    return this.contractsView.length;
  }

  get totalInstallments(): number {
    return this.contractsView.reduce((total, contract) => total + contract.summary.installmentCount, 0);
  }

  get totalPaidInstallments(): number {
    return this.contractsView.reduce((total, contract) => total + contract.summary.paidCount, 0);
  }

  get totalOverdueInstallments(): number {
    return this.contractsView.reduce((total, contract) => total + contract.summary.overdueCount, 0);
  }

  get totalMoraInstallments(): number {
    return this.contractsView.reduce(
      (total, contract) => total + contract.installments.filter((installment) => installment.isMora).length,
      0
    );
  }

  get overallProgressPercentage(): number {
    if (this.totalInstallments <= 0) {
      return 0;
    }

    return (this.totalPaidInstallments / this.totalInstallments) * 100;
  }

  get moroThresholdLabel(): string {
    return `${MORO_DEFAULT_DAYS} dias`;
  }

  get installmentFilters(): Array<{ key: InstallmentFilter; label: string; count: number }> {
    return [
      { key: 'all', label: 'Todas', count: this.getInstallmentFilterCount('all') },
      { key: 'paid', label: 'Pagadas', count: this.getInstallmentFilterCount('paid') },
      { key: 'mora', label: 'Mora', count: this.getInstallmentFilterCount('mora') },
      { key: 'overdue', label: 'Vencidas', count: this.getInstallmentFilterCount('overdue') },
      { key: 'pending', label: 'Proximos', count: this.getInstallmentFilterCount('pending') },
    ];
  }

  get canManageActions(): boolean {
    return this.source === 'collector' || this.source === 'admin';
  }

  get canEditClientData(): boolean {
    const userRole = this.authService.getUser()?.role?.name?.toLowerCase() ?? '';
    return ['admin', 'collector', 'super_collector'].includes(userRole);
  }

  get hasPendingUpdates(): boolean {
    return (this.pendingUpdates?.summary.totalCount ?? 0) > 0;
  }

  get pendingItems(): PortfolioPendingImportItemInterface[] {
    return this.pendingUpdates?.items ?? [];
  }

  get editingInstallmentTitle(): string {
    const installmentNumber = this.editingInstallmentContext?.installment.number;
    return installmentNumber ? `Editar cuota #${installmentNumber}` : 'Editar cuota';
  }

  get editingInstallmentDescription(): string {
    const context = this.editingInstallmentContext;

    if (!context) {
      return 'Actualiza el pago, canal, estado y comprobante asociado a la cuota.';
    }

    const segments = [
      context.contractBlock ? `MZ ${context.contractBlock}` : null,
      context.contractLot ? `Lote ${context.contractLot}` : null,
    ].filter((value): value is string => !!value);

    if (segments.length === 0) {
      return 'Actualiza el pago, canal, estado y comprobante asociado a la cuota.';
    }

    return `Actualiza el pago, canal, estado y comprobante asociado a la cuota del contrato ${segments.join(' · ')}.`;
  }

  goBack(): void {
    const collectorId = this.route.snapshot.queryParamMap.get('collectorId');
    if (collectorId) {
      this.router.navigate(['/collector'], { queryParams: { collectorId } });
    } else {
      this.router.navigate([this.canManageActions ? '/collector' : '/portfolio']);
    }
  }

  getPendingInstallments(contract: ContractView): number {
    return Math.max(contract.summary.installmentCount - contract.summary.paidCount - contract.summary.overdueCount, 0);
  }

  getContractProgressPercentage(contract: ContractView): number {
    if (contract.summary.installmentCount <= 0) {
      return 0;
    }

    return (contract.summary.paidCount / contract.summary.installmentCount) * 100;
  }

  getContractTone(contract: ContractView): 'mora' | 'overdue' | 'healthy' {
    if (contract.installments.some((installment) => installment.isMora)) {
      return 'mora';
    }

    if (contract.summary.overdueCount > 0) {
      return 'overdue';
    }

    return 'healthy';
  }

  setInstallmentViewMode(mode: InstallmentViewMode): void {
    this.installmentViewMode = mode;
  }

  setInstallmentFilter(filter: InstallmentFilter): void {
    this.installmentFilter = filter;
  }

  isInstallmentFilterActive(filter: InstallmentFilter): boolean {
    return this.installmentFilter === filter;
  }

  getFilteredInstallments(contract: ContractView): InstallmentView[] {
    return contract.installments.filter((installment) => this.matchesInstallmentFilter(installment, this.installmentFilter));
  }

  getInstallmentCardTone(installment: InstallmentView): 'paid' | 'mora' | 'overdue' | 'pending' {
    if (installment.isPaid) {
      return 'paid';
    }

    if (installment.isMora) {
      return 'mora';
    }

    if (installment.isOverdue) {
      return 'overdue';
    }

    return 'pending';
  }

  getInstallmentSecondaryLabel(installment: InstallmentView): string {
    if (installment.isPaid) {
      return installment.paymentDate ? `Pago: ${this.formatDateOnly(installment.paymentDate)}` : 'Pago registrado';
    }

    if (installment.isMora) {
      return `${installment.daysOverdue} dia(s) de mora`;
    }

    if (installment.isOverdue) {
      return `${installment.daysOverdue} dia(s) de atraso`;
    }

    return installment.dueDate ? `Vence: ${this.formatDateOnly(installment.dueDate)}` : 'Pendiente';
  }

  getInstallmentStatusCount(contract: ContractView, filter: InstallmentFilter): number {
    return contract.installments.filter((installment) => this.matchesInstallmentFilter(installment, filter)).length;
  }

  getInstallmentStateLabel(installment: InstallmentView): string {
    if (installment.isPaid) {
      return 'Pagada';
    }

    if (installment.isPartial) {
      return 'Parcial';
    }

    if (installment.isMora) {
      return 'Mora';
    }

    if (installment.isOverdue) {
      return 'Vencida';
    }

    return 'Proximo pago';
  }

  getInstallmentPaymentChannelLabel(installment: InstallmentView): string {
    return installment.paymentChannel?.trim() || '-';
  }

  getInstallmentPaymentReferenceLabel(installment: InstallmentView): string {
    return installment.paymentReference?.trim() || '-';
  }

  getInstallmentTypeLabel(installment: InstallmentView): string {
    return installment.installmentType?.trim().toUpperCase() || '-';
  }

  getInstallmentImportedStatusLabel(installment: InstallmentView): string {
    return installment.importedStatus?.trim().toUpperCase() || '-';
  }

  getInstallmentPaymentTypeLabel(installment: InstallmentView): string {
    return installment.paymentType?.trim().toUpperCase() || '-';
  }

  getInstallmentPaymentMethodLabel(installment: InstallmentView): string {
    return installment.paymentMethod?.trim() || '-';
  }

  getInstallmentPaymentBankLabel(installment: InstallmentView): string {
    return installment.paymentBank?.trim() || '-';
  }

  getInstallmentPaymentBankOriginLabel(installment: InstallmentView): string {
    return installment.paymentBankOrigin?.trim() || '-';
  }

  getInstallmentPaymentSummary(installment: InstallmentView): string {
    return [
      installment.paymentMethod?.trim(),
      installment.paymentBank?.trim(),
      installment.paymentBankOrigin?.trim(),
    ]
      .filter((value): value is string => !!value)
      .join(' / ');
  }

  getInstallmentPendingAmountLabel(installment: InstallmentView): string {
    return installment.pendingAmount > 0 ? installment.pendingAmount.toFixed(2) : '0.00';
  }

  openEditClientModal(): void {
    if (!this.client || !this.canEditClientData) {
      return;
    }

    this.syncClientForm(this.client);
    this.clientModalFeedback = null;
    this.clientModalError = null;
    this.showEditClientModal = true;
  }

  closeEditClientModal(): void {
    this.showEditClientModal = false;
    this.clientModalFeedback = null;
    this.clientModalError = null;

    if (this.client) {
      this.syncClientForm(this.client);
    }
  }

  saveClientChanges(): void {
    if (!this.client || !this.canEditClientData) {
      return;
    }

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const formValue = this.clientForm.getRawValue();

    this.clientSaving = true;
    this.clientModalFeedback = null;
    this.clientModalError = null;

    this.portfolioService
      .updateClientPersonalData({
        clientId: this.client.id,
        full_name: formValue.full_name?.trim() ?? '',
        email: this.normalizeNullableText(formValue.email),
        phone: this.normalizeNullableText(formValue.phone),
        address: this.normalizeNullableText(formValue.address),
        district: this.normalizeNullableText(formValue.district),
        province: this.normalizeNullableText(formValue.province),
        department: this.normalizeNullableText(formValue.department),
        dni: this.normalizeNullableText(formValue.dni),
      })
      .pipe(finalize(() => {
        this.clientSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.client = updatedClient;
          this.syncClientForm(updatedClient);
          this.showEditClientModal = false;
          this.setDetailFeedback('Datos del cliente actualizados correctamente.');
        },
        error: (err) => {
          this.clientModalError = err?.error?.message ?? 'No se pudo actualizar el cliente.';
          this.cdr.markForCheck();
        },
      });
  }

  openInstallmentModal(contract: ContractView, installment: InstallmentView): void {
    if (!this.client || !this.canEditClientData) {
      return;
    }

    this.editingInstallmentContext = {
      contractId: contract.id,
      contractLot: contract.lot,
      contractBlock: contract.block,
      installment,
    };
    this.installmentModalFeedback = null;
    this.installmentModalError = null;
    this.installmentForm.reset({
      installmentType: installment.installmentType ?? '',
      paymentDate: installment.paymentDate ?? '',
      paidAmount: installment.paidAmount,
      importedStatus: installment.importedStatus ?? '',
      paymentType: installment.paymentType ?? '',
      paymentChannel: installment.paymentChannel ?? '',
      paymentReference: installment.paymentReference ?? '',
      paymentMethod: installment.paymentMethod ?? '',
      paymentBank: installment.paymentBank ?? '',
      paymentBankOrigin: installment.paymentBankOrigin ?? '',
      status: installment.status ?? '',
    });
    this.syncInstallmentDerivedFields();
    this.showInstallmentModal = true;
  }

  closeInstallmentModal(): void {
    this.showInstallmentModal = false;
    this.editingInstallmentContext = null;
    this.installmentModalFeedback = null;
    this.installmentModalError = null;
    this.installmentForm.reset({
      installmentType: '',
      paymentDate: '',
      paidAmount: null,
      importedStatus: '',
      paymentType: '',
      paymentChannel: '',
      paymentReference: '',
      paymentMethod: '',
      paymentBank: '',
      paymentBankOrigin: '',
      status: '',
    });
  }

  saveInstallmentChanges(): void {
    if (!this.client || !this.editingInstallmentContext || !this.canEditClientData) {
      return;
    }

    if (this.installmentForm.invalid) {
      this.installmentForm.markAllAsTouched();
      return;
    }

    const formValue = this.installmentForm.getRawValue();

    this.installmentSaving = true;
    this.installmentModalFeedback = null;
    this.installmentModalError = null;

    this.portfolioService
      .updateInstallmentPayment({
        clientId: this.client.id,
        installmentId: this.editingInstallmentContext.installment.id,
        installmentType: this.normalizeNullableText(formValue.installmentType),
        paymentDate: this.normalizeNullableText(formValue.paymentDate),
        paidAmount: this.normalizeNullableNumber(formValue.paidAmount),
        importedStatus: this.normalizeNullableText(formValue.importedStatus),
        paymentType: this.normalizeNullableText(formValue.paymentType),
        paymentChannel: this.normalizeNullableText(formValue.paymentChannel),
        paymentReference: this.normalizeNullableText(formValue.paymentReference),
        paymentMethod: this.normalizeNullableText(formValue.paymentMethod),
        paymentBank: this.normalizeNullableText(formValue.paymentBank),
        paymentBankOrigin: this.normalizeNullableText(formValue.paymentBankOrigin),
        status: this.normalizeNullableText(formValue.status),
      })
      .pipe(finalize(() => {
        this.installmentSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedClient) => {
          this.client = updatedClient;
          this.syncClientForm(updatedClient);
          this.closeInstallmentModal();
          this.setDetailFeedback('Cuota actualizada correctamente con su comprobante de pago.');
        },
        error: (err) => {
          this.installmentModalError = err?.error?.message ?? 'No se pudo actualizar la cuota.';
          this.cdr.markForCheck();
        },
      });
  }

  getActionTypeState(actionTypeId: string): boolean {
    return this.history.some((item) => item.actionTypeId === actionTypeId);
  }

  getActionTypeLastDate(actionTypeId: string): string {
    const historyItem = this.history.find((item) => item.actionTypeId === actionTypeId);
    return this.formatDateTime(historyItem?.actionDate);
  }

  isActionTypeAvailable(actionTypeId: string): boolean {
    return !this.getActionTypeState(actionTypeId);
  }

  approvePendingUpdates(): void {
    if (!this.clientId || this.pendingSaving || !this.hasPendingUpdates) {
      return;
    }

    this.pendingSaving = true;
    this.pendingFeedback = null;

    this.portfolioService
      .approvePendingImportUpdates(this.clientId)
      .pipe(finalize(() => {
        this.pendingSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (client) => {
          this.client = client;
          this.syncClientForm(client);
          this.pendingFeedback = 'Cambios aplicados correctamente a la cartera.';
          this.pendingUpdates = {
            clientId: client.id,
            summary: { generalCount: 0, scheduleCount: 0, totalCount: 0 },
            items: [],
          };
          this.loadClient();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.pendingFeedback = err?.error?.message ?? 'No se pudieron aplicar los cambios pendientes.';
          this.cdr.markForCheck();
        },
      });
  }

  rejectPendingUpdates(): void {
    if (!this.clientId || this.pendingSaving || !this.hasPendingUpdates) {
      return;
    }

    this.pendingSaving = true;
    this.pendingFeedback = null;

    this.portfolioService
      .rejectPendingImportUpdates(this.clientId)
      .pipe(finalize(() => {
        this.pendingSaving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (client) => {
          this.client = client;
          this.syncClientForm(client);
          this.pendingFeedback = 'Cambios pendientes descartados correctamente.';
          this.pendingUpdates = {
            clientId: client.id,
            summary: { generalCount: 0, scheduleCount: 0, totalCount: 0 },
            items: [],
          };
          this.loadClient();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.pendingFeedback = err?.error?.message ?? 'No se pudieron rechazar los cambios pendientes.';
          this.cdr.markForCheck();
        },
      });
  }

  registerAction(): void {
    if (!this.canManageActions || !this.clientId) {
      return;
    }

    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const formValue = this.actionForm.getRawValue();
    const actionTypeId = formValue.actionTypeId ?? '';

    if (!this.isActionTypeAvailable(actionTypeId)) {
      this.actionFeedback = 'Esta accion ya fue registrada para este cliente.';
      this.cdr.markForCheck();
      return;
    }

    this.actionSaving = true;
    this.actionFeedback = null;

    this.portfolioService
      .registerClientAction({
        clientId: this.clientId,
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
          this.history = [historyItem, ...this.history];
          if (this.client) {
            this.client = {
              ...this.client,
              latestAction: historyItem,
            };
          }

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

  trackByContract(_: number, contract: ContractView): string {
    return contract.id;
  }

  trackByInstallment(_: number, installment: InstallmentView): string {
    return installment.id;
  }

  trackByPendingItem(_: number, item: PortfolioPendingImportItemInterface): string {
    return item.id;
  }

  getPendingItemTitle(item: PortfolioPendingImportItemInterface): string {
    if (item.detailType === 'schedule') {
      return `Cronograma${item.contractLot ? ` · Lote ${item.contractLot}` : ''}${item.installmentNumber ? ` · Cuota ${item.installmentNumber}` : ''}`;
    }

    return `Datos generales${item.contractLot ? ` · Lote ${item.contractLot}` : ''}`;
  }

  getPendingItemRows(item: PortfolioPendingImportItemInterface): string {
    const rows = item.rows.filter((row): row is number => typeof row === 'number');
    return rows.length ? rows.join(', ') : '-';
  }

  private getInstallmentFilterCount(filter: InstallmentFilter): number {
    return this.contractsView.reduce(
      (total, contract) => total + contract.installments.filter((installment) => this.matchesInstallmentFilter(installment, filter)).length,
      0
    );
  }

  private matchesInstallmentFilter(installment: InstallmentView, filter: InstallmentFilter): boolean {
    switch (filter) {
      case 'paid':
        return installment.isPaid;
      case 'mora':
        return installment.isMora;
      case 'overdue':
        return installment.isOverdue && !installment.isMora;
      case 'pending':
        return !installment.isPaid && !installment.isOverdue;
      case 'all':
      default:
        return true;
    }
  }

  private buildInstallmentView(inst: PortfolioInstallmentInterface): InstallmentView {
    const today = new Date();
    const dueDate = inst.dueDate ? new Date(inst.dueDate) : null;
    const amount = inst.amount ?? 0;
    const paidAmount = inst.paidAmount ?? 0;
    const pendingAmount = Math.max(amount - paidAmount, 0);
    const tolerance = 0.1;
    const isPaid = pendingAmount <= tolerance;
    const paymentType = (inst.paymentType ?? '').trim().toLowerCase();
    const isPartial = !isPaid && (paymentType === 'parcial' || paidAmount > 0);
    let daysOverdue = 0;
    let isOverdue = false;
    let isMora = false;

    if (dueDate && !isPaid) {
      const diffTime = today.getTime() - dueDate.getTime();
      daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      isOverdue = daysOverdue > 0;
      isMora = daysOverdue >= MORO_DEFAULT_DAYS;
    }

    return {
      id: inst.id,
      number: inst.number,
      installmentType: inst.installmentType,
      amount: inst.amount,
      dueDate: inst.dueDate,
      paymentDate: inst.paymentDate,
      paidAmount: inst.paidAmount,
      paymentChannel: inst.paymentChannel,
      paymentReference: inst.paymentReference,
      importedStatus: inst.importedStatus,
      paymentType: inst.paymentType,
      paymentMethod: inst.paymentMethod,
      paymentBank: inst.paymentBank,
      paymentBankOrigin: inst.paymentBankOrigin,
      status: inst.status,
      pendingAmount,
      daysOverdue,
      isOverdue,
      isMora,
      isPaid,
      isPartial,
    };
  }

  private loadClient(): void {
    this.loading = true;
    this.error = null;
    const collectorId = this.route.snapshot.queryParamMap.get('collectorId');
    const request$ = collectorId
      ? this.portfolioService.getAll(collectorId)
      : this.canManageActions
        ? this.portfolioService.getCollectorWallet()
        : this.portfolioService.getAll();

    request$
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (clients) => {
          this.client = clients.find((c) => c.id === this.clientId) || null;
          if (!this.client) {
            this.error = 'No se encontró el cliente.';
            return;
          }

          this.syncClientForm(this.client);
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo cargar el cliente.';
        },
      });
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

  private loadClientHistory(clientId: string): void {
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
          this.history = history;
          this.historyError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.history = [];
          this.historyError = err?.error?.message ?? 'No se pudo cargar el historial de acciones.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadPendingUpdates(clientId: string): void {
    this.pendingLoading = true;
    this.pendingError = null;

    this.portfolioService
      .getPendingImportUpdates(clientId)
      .pipe(finalize(() => {
        this.pendingLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (pendingUpdates) => {
          this.pendingUpdates = pendingUpdates;
          this.pendingError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.pendingUpdates = null;
          this.pendingError = err?.error?.message ?? 'No se pudieron cargar las actualizaciones pendientes.';
          this.cdr.markForCheck();
        },
      });
  }

  private resolveSource(source: string | null): 'general' | 'collector' | 'admin' {
    const sourceTrim = (source ?? '').trim().toLowerCase();
    if (sourceTrim === 'collector') return 'collector';
    if (sourceTrim === 'admin') return 'admin';
    return 'general';
  }

  private syncClientForm(client: PortfolioClientInterface): void {
    this.clientForm.reset({
      full_name: client.fullName ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      district: client.district ?? '',
      province: client.province ?? '',
      department: client.department ?? '',
      dni: client.dni ?? '',
    });
  }

  private normalizeNullableText(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private normalizeNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private setDetailFeedback(message: string): void {
    this.detailFeedback = message;
    this.cdr.markForCheck();

    setTimeout(() => {
      if (this.detailFeedback === message) {
        this.detailFeedback = null;
        this.cdr.markForCheck();
      }
    }, 4000);
  }

  private syncInstallmentDerivedFields(): void {
    const installment = this.editingInstallmentContext?.installment;

    if (!installment) {
      return;
    }

    const paymentType = String(this.installmentForm.controls.paymentType.value ?? '').trim().toLowerCase();
    const paidAmountRaw = this.installmentForm.controls.paidAmount.value;
    const paidAmount = typeof paidAmountRaw === 'number' ? paidAmountRaw : Number(paidAmountRaw ?? 0);
    const installmentAmount = installment.amount ?? 0;
    const tolerance = 0.1;
    let nextStatus = installment.status ?? 'Pendiente';

    if (installmentAmount > 0 && paidAmount >= installmentAmount - tolerance) {
      nextStatus = 'Pagada';
    } else if (paymentType === 'parcial' || (paidAmount > 0 && paidAmount < installmentAmount - tolerance)) {
      nextStatus = 'Parcial';
    } else if (installment.dueDate && new Date(installment.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
      nextStatus = 'Vencida';
    } else {
      nextStatus = 'Pendiente';
    }

    this.installmentForm.controls.status.setValue(nextStatus, { emitEvent: false });
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

  private formatDateOnly(value: string | null | undefined): string {
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
    }).format(date);
  }
}
