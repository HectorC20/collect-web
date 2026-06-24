import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { SharedModule } from '@/app/shared/shared.module';
import { ModalComponent } from '@/app/shared/components/modal/modal.component';
import { ConfirmActionModalService } from '@/app/shared/components/confirm-action-modal/confirm-action-modal.service';
import {
  AgentChannelOptionInterface,
  AgentCredentialInterface,
  AgentCredentialTestResultInterface,
  AgentMcpDatasetOptionInterface,
  AgentMcpPreviewResponseInterface,
  AgentMcpToolInterface,
  AgentPlaygroundResponseInterface,
  AgentProviderInterface,
  AgentRuntimeToolInterface,
  AgentSetupStatusInterface,
  AgentSetupStepInterface,
  AgentUserSettingInterface,
  UpsertAgentCredentialPayload,
  UpsertAgentUserSettingPayload,
} from '@/app/interfaces/agentllm-admin.interface';
import { WhatsappSessionView } from '@/app/interfaces/whatsappconversation.interface';
import { UserModel } from '@/app/models/user.model';
import { AuthService } from '@/app/services/auth.service';
import {
  CLIENT_STATUS,
  CLIENT_STATUS_DICTIONARY,
  LOT_STATUS,
  LOT_STATUS_DICTIONARY,
} from '@/app/shared/dictionary/status.dictionary';
import { AgentLlmReactiveFacadeService } from './agentllm-reactive-facade.service';
import {
  AgentMcpPreset,
  buildMcpPayloadFromValue,
  buildPreviewArguments,
  getCompletedSteps,
  getCredentialLabel as resolveCredentialLabel,
  getCredentialStatusClass as resolveCredentialStatusClass,
  getCredentialStatusLabel as resolveCredentialStatusLabel,
  getCredentialTestMessage as resolveCredentialTestMessage,
  getMcpFilterResetPatch,
  getMcpPresetPatch,
  getMcpPreviewDefaults,
  getNextStep,
  getProgressPercent,
} from './agentllm.utils';
import { generateSlug, normalizeOptionalString, stringifyDefaultFilter } from '@/app/shared/utils/string.utils';
import { AGENTLLM_CHANNEL_LABEL_MAP } from '@/app/shared/dictionary/agentllm-channel.dictionary';

@Component({
  selector: 'app-agentllm',
  standalone: true,
  imports: [SharedModule, ModalComponent],
  providers: [AgentLlmReactiveFacadeService],
  templateUrl: './agentllm.html',
  styleUrl: './agentllm.scss',
})
export class AgentLLMComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmActionModalService);
  private readonly facade = inject(AgentLlmReactiveFacadeService);

  private readonly selectedMcpToolIdState = signal<string | null>(null);
  private readonly selectedCredentialIdState = signal<string | null>(null);
  private readonly selectedPreviewToolIdState = signal<string | null>(null);
  private readonly showCredentialModalState = signal(false);
  private readonly showMcpToolModalState = signal(false);
  private readonly showMcpPreviewModalState = signal(false);
  private readonly showMcpAdvancedOptionsState = signal(false);
  private readonly currentMcpPresetState = signal<AgentMcpPreset | null>(null);

  readonly currentUser: UserModel | null = this.authService.getUser();

  readonly CLIENT_STATUS = CLIENT_STATUS;
  readonly LOT_STATUS = LOT_STATUS;
  readonly clientStatusList = Object.values(CLIENT_STATUS);
  readonly lotStatusList = Object.values(LOT_STATUS);
  readonly clientStatusDictionary = CLIENT_STATUS_DICTIONARY;
  readonly lotStatusDictionary = LOT_STATUS_DICTIONARY;

  readonly mcpToolForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: [''],
    description: [''],
    dataset_key: ['client_portfolio', [Validators.required]],
    max_results: [25, [Validators.required, Validators.min(1), Validators.max(200)]],
    allow_phone_targeting: [true],
    is_active: [true],
    allowed_channels: this.fb.control<string[]>([]),
    allowed_fields: this.fb.control<string[]>([]),
    allowed_filters: this.fb.control<string[]>([]),
    default_client_status: [''],
    default_lot_status: [''],
    default_sale_type: [''],
    default_has_phone: [false],
    default_installment_status: [''],
    default_has_pending_installments: [false],
    default_has_overdue_installments: [false],
  });

  readonly credentialForm = this.fb.group({
    provider_id: [null as string | null, [Validators.required]],
    alias: [''],
    api_key: ['', [Validators.maxLength(2000)]],
    is_active: [true],
  });

  readonly agentForm = this.fb.group({
    agent_enabled: [false],
    provider_credential_id: [null as string | null],
    preferred_channel: ['web'],
    allowed_whatsapp_session_ids: this.fb.nonNullable.control<string[]>([]),
  });

  readonly mcpPreviewForm = this.fb.group({
    search: [''],
    limit: [10 as number | null],
    client_status: [''],
    lot_status: [''],
    sale_type: [''],
    installment_status: [''],
    has_phone: [false],
    has_pending_installments: [false],
    has_overdue_installments: [false],
  });

  readonly playgroundForm = this.fb.group({
    prompt: ['', [Validators.required, Validators.maxLength(10000)]],
    session_id: [''],
    channel: ['web'],
    allowed_tools: this.fb.nonNullable.control<string[]>([]),
  });

  ngOnInit(): void {
    this.resetCredentialForm();
    this.setupMcpToolFormState();
    void this.loadData();
  }

  get setupSteps(): AgentSetupStepInterface[] {
    return this.setupStatus?.steps ?? [];
  }

  get completedSteps(): number {
    return getCompletedSteps(this.setupSteps);
  }

  get progressPercent(): number {
    return getProgressPercent(this.setupSteps);
  }

  get nextStep(): AgentSetupStepInterface | null {
    return getNextStep(this.setupSteps);
  }

  get activeCredentials(): AgentCredentialInterface[] {
    return this.facade.activeCredentials();
  }

  get providers(): AgentProviderInterface[] {
    return this.facade.providers();
  }

  get mcpDatasets(): AgentMcpDatasetOptionInterface[] {
    return this.facade.mcpDatasets();
  }

  get channels(): AgentChannelOptionInterface[] {
    return this.facade.channels();
  }

  get mcpTools(): AgentMcpToolInterface[] {
    return this.facade.mcpTools();
  }

  get credentials(): AgentCredentialInterface[] {
    return this.facade.credentials();
  }

  get whatsappSessions(): WhatsappSessionView[] {
    return this.facade.whatsappSessions();
  }

  get runtimeTools(): AgentRuntimeToolInterface[] {
    return this.facade.runtimeTools();
  }

  get setupStatus(): AgentSetupStatusInterface | null {
    return this.facade.setupStatus();
  }

  get setting(): AgentUserSettingInterface | null {
    return this.facade.setting();
  }

  get loading(): boolean {
    return this.facade.loading();
  }

  get savingCredential(): boolean {
    return this.facade.savingCredential();
  }

  get savingAccess(): boolean {
    return this.facade.savingAccess();
  }

  get savingMcpTool(): boolean {
    return this.facade.savingMcpTool();
  }

  get previewingMcpToolId(): string | null {
    return this.facade.previewingMcpToolId();
  }

  get testingCredentialId(): string | null {
    return this.facade.testingCredentialId();
  }

  get deletingMcpToolId(): string | null {
    return this.facade.deletingMcpToolId();
  }

  get deletingCredentialId(): string | null {
    return this.facade.deletingCredentialId();
  }

  get selectedMcpToolId(): string | null {
    return this.selectedMcpToolIdState();
  }

  get selectedCredentialId(): string | null {
    return this.selectedCredentialIdState();
  }

  get selectedPreviewToolId(): string | null {
    return this.selectedPreviewToolIdState();
  }

  get runningPlayground(): boolean {
    return this.facade.runningPlayground();
  }

  get showCredentialModal(): boolean {
    return this.showCredentialModalState();
  }

  get showMcpToolModal(): boolean {
    return this.showMcpToolModalState();
  }

  get showMcpPreviewModal(): boolean {
    return this.showMcpPreviewModalState();
  }

  get showMcpAdvancedOptions(): boolean {
    return this.showMcpAdvancedOptionsState();
  }

  get currentMcpPreset(): AgentMcpPreset | null {
    return this.currentMcpPresetState();
  }

  get feedback(): string | null {
    return this.facade.feedback();
  }

  get error(): string | null {
    return this.facade.error();
  }

  get credentialTestResult(): AgentCredentialTestResultInterface | null {
    return this.facade.credentialTestResult();
  }

  get playgroundError(): string | null {
    return this.facade.playgroundError();
  }

  get mcpPreview(): AgentMcpPreviewResponseInterface | null {
    return this.facade.mcpPreview();
  }

  get playgroundResult(): AgentPlaygroundResponseInterface | null {
    return this.facade.playgroundResult();
  }

  get selectedPreviewTool(): AgentMcpToolInterface | null {
    return this.mcpTools.find((item) => item.id === this.selectedPreviewToolId) ?? null;
  }

  get selectedMcpDataset(): AgentMcpDatasetOptionInterface | null {
    const datasetKey = this.mcpToolForm.value.dataset_key ?? '';
    return this.mcpDatasets.find((item) => item.key === datasetKey) ?? null;
  }

  get currentCredentialLabel(): string {
    const credentialId = this.agentForm.value.provider_credential_id ?? null;
    const credential = this.credentials.find((item) => item.id === credentialId);
    return credential ? this.getCredentialLabel(credential) : 'Sin seleccionar';
  }

  async loadData(): Promise<void> {
    await this.facade.loadData();
    this.syncFormsAfterLoad();
  }

  openCreateCredentialModal(providerId?: string): void {
    this.resetCredentialForm();
    if (providerId) {
      this.credentialForm.patchValue({ provider_id: providerId });
    }
    this.facade.clearCredentialTestResult();
    this.facade.clearMessages();
    this.showCredentialModalState.set(true);
  }

  openEditCredentialModal(credential: AgentCredentialInterface): void {
    this.selectedCredentialIdState.set(credential.id);
    this.credentialForm.patchValue({
      provider_id: credential.provider_id,
      alias: credential.alias ?? '',
      api_key: '',
      is_active: credential.is_active,
    });
    this.showCredentialModalState.set(true);
    this.facade.clearMessages();
  }

  closeCredentialModal(): void {
    this.showCredentialModalState.set(false);
    this.resetCredentialForm();
  }

  selectCredentialProvider(providerId: string): void {
    this.credentialForm.patchValue({ provider_id: providerId });
  }

  isCredentialProviderSelected(providerId: string): boolean {
    return (this.credentialForm.value.provider_id ?? null) === providerId;
  }

  getProviderSummary(provider: AgentProviderInterface): string {
    const driver = (provider.driver ?? '').toLowerCase();

    if (driver === 'openai') {
      return 'GPT, razonamiento y tool calling.';
    }

    if (driver === 'gemini') {
      return 'Modelos multimodales de Google.';
    }

    if (driver === 'deepseek') {
      return 'Chat rapido y razonamiento avanzado.';
    }

    return `Driver ${provider.driver}`;
  }

  getProviderToneClass(provider: AgentProviderInterface): string {
    const driver = (provider.driver ?? '').toLowerCase();

    if (driver === 'openai') {
      return 'provider-tile-openai';
    }

    if (driver === 'gemini') {
      return 'provider-tile-gemini';
    }

    if (driver === 'deepseek') {
      return 'provider-tile-deepseek';
    }

    return 'provider-tile-generic';
  }

  async saveCredential(): Promise<void> {
    this.credentialForm.markAllAsTouched();

    if (this.credentialForm.invalid) {
      this.facade.error.set('Completa correctamente el formulario de la API key.');
      return;
    }

    const apiKey = (this.credentialForm.value.api_key ?? '').trim();
    if (!this.selectedCredentialId && apiKey === '') {
      this.facade.error.set('La API key es obligatoria para registrar una nueva credencial.');
      return;
    }

    const payload: UpsertAgentCredentialPayload = {
      provider_id: this.credentialForm.value.provider_id ?? '',
      alias: normalizeOptionalString(this.credentialForm.value.alias),
      api_key: apiKey || undefined,
      is_active: this.credentialForm.value.is_active ?? true,
    };

    const saved = await this.facade.saveCredential(this.selectedCredentialId, payload);
    if (saved) {
      this.closeCredentialModal();
      this.syncFormsAfterLoad();
    }
  }

  deleteCredential(credential: AgentCredentialInterface): void {
    this.confirmService.open(
      {
        title: 'Eliminar API key',
        message: '¿Seguro que deseas eliminar esta API key?',
        details: `Se eliminará la API key "${credential.alias || credential.provider_name}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        void this.handleDeleteCredential(credential.id);
      }
    );
  }

  testCredential(credential: AgentCredentialInterface): void {
    void this.facade.testCredential(credential);
  }

  async saveAgentSetting(): Promise<void> {
    this.agentForm.markAllAsTouched();

    const payload: UpsertAgentUserSettingPayload = {
      agent_enabled: this.agentForm.value.agent_enabled ?? false,
      provider_credential_id: this.agentForm.value.provider_credential_id ?? null,
      preferred_channel: this.agentForm.value.preferred_channel ?? 'web',
      allowed_whatsapp_session_ids: this.agentForm.value.allowed_whatsapp_session_ids ?? [],
    };

    if (payload.agent_enabled && !payload.provider_credential_id) {
      this.facade.error.set('Selecciona una API key antes de activar el agente.');
      return;
    }

    await this.facade.saveAgentSetting(payload);
  }

  isWhatsappSessionAllowed(sessionId: string): boolean {
    return (this.agentForm.value.allowed_whatsapp_session_ids ?? []).includes(sessionId);
  }

  toggleWhatsappSessionAccess(sessionId: string, checked: boolean): void {
    const current = new Set(this.agentForm.value.allowed_whatsapp_session_ids ?? []);
    checked ? current.add(sessionId) : current.delete(sessionId);
    this.agentForm.patchValue({ allowed_whatsapp_session_ids: Array.from(current) });
  }

  getSelectedWhatsappSessionsSummary(): WhatsappSessionView[] {
    const selectedIds = new Set(this.agentForm.value.allowed_whatsapp_session_ids ?? []);
    return this.whatsappSessions.filter((session) => selectedIds.has(session.id));
  }

  selectAllPlaygroundTools(): void {
    this.playgroundForm.patchValue({
      allowed_tools: this.runtimeTools
        .filter((tool) => this.isRuntimeToolCompatibleWithSelectedChannel(tool))
        .map((tool) => tool.name),
    });
  }

  clearPlaygroundToolSelection(): void {
    this.playgroundForm.patchValue({ allowed_tools: [] });
  }

  isPlaygroundToolSelected(toolName: string): boolean {
    return (this.playgroundForm.value.allowed_tools ?? []).includes(toolName);
  }

  togglePlaygroundTool(toolName: string, checked: boolean): void {
    const current = new Set(this.playgroundForm.value.allowed_tools ?? []);
    checked ? current.add(toolName) : current.delete(toolName);
    this.playgroundForm.patchValue({ allowed_tools: Array.from(current) });
  }

  runPlayground(): void {
    this.playgroundForm.markAllAsTouched();

    if (this.playgroundForm.invalid) {
      this.facade.playgroundError.set('Escribe un prompt para probar el agente.');
      return;
    }

    if (!this.setting?.agent_enabled) {
      this.facade.playgroundError.set('Primero activa el agente antes de ejecutar el playground.');
      return;
    }

    void this.facade.runPlayground({
        prompt: (this.playgroundForm.value.prompt ?? '').trim(),
        session_id: (this.playgroundForm.value.session_id ?? '').trim() || null,
        channel: this.playgroundForm.value.channel ?? this.setting?.preferred_channel ?? 'web',
        allowed_tools: (this.playgroundForm.value.allowed_tools ?? []).filter((toolName) =>
          this.runtimeTools.some((tool) => tool.name === toolName && this.isRuntimeToolCompatibleWithSelectedChannel(tool))
        ),
      });
  }

  openCreateMcpToolModal(): void {
    this.resetMcpToolForm();
    this.applyMcpPreset('clients');
    this.showMcpToolModalState.set(true);
  }

  openEditMcpToolModal(tool: AgentMcpToolInterface): void {
    this.selectedMcpToolIdState.set(tool.id);
    this.mcpToolForm.patchValue({
      name: tool.name,
      slug: tool.slug,
      description: tool.description ?? '',
      dataset_key: tool.dataset_key,
      max_results: tool.max_results,
      allow_phone_targeting: tool.allow_phone_targeting,
      is_active: tool.is_active,
      allowed_channels: [...tool.allowed_channels],
      allowed_fields: [...tool.allowed_fields],
      allowed_filters: [...tool.allowed_filters],
      default_client_status: stringifyDefaultFilter(tool.default_filters['client_status']),
      default_lot_status: stringifyDefaultFilter(tool.default_filters['lot_status']),
      default_sale_type: stringifyDefaultFilter(tool.default_filters['sale_type']),
      default_has_phone: tool.default_filters['has_phone'] === true,
      default_installment_status: stringifyDefaultFilter(tool.default_filters['installment_status']),
      default_has_pending_installments: tool.default_filters['has_pending_installments'] === true,
      default_has_overdue_installments: tool.default_filters['has_overdue_installments'] === true,
    });
    this.showMcpAdvancedOptionsState.set(false);
    this.facade.clearPreviewResult();
    this.showMcpToolModalState.set(true);
  }

  closeMcpToolModal(): void {
    this.showMcpToolModalState.set(false);
    this.resetMcpToolForm();
  }

  async saveMcpTool(): Promise<void> {
    this.mcpToolForm.markAllAsTouched();
    const { payload, error } = buildMcpPayloadFromValue(this.mcpToolForm.getRawValue());
    if (!payload) {
      this.facade.error.set(error ?? 'Completa correctamente el formulario de la herramienta MCP.');
      return;
    }

    const saved = await this.facade.saveMcpTool(this.selectedMcpToolId, payload);
    if (saved) {
      this.closeMcpToolModal();
      this.syncFormsAfterLoad();
    }
  }

  deleteMcpTool(tool: AgentMcpToolInterface): void {
    this.confirmService.open(
      {
        title: 'Eliminar herramienta MCP',
        message: '¿Seguro que deseas eliminar la herramienta MCP?',
        details: `Se eliminará la herramienta MCP "${tool.name}". Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        variant: 'danger',
      },
      () => {
        void this.handleDeleteMcpTool(tool.id);
      }
    );
  }

  openMcpPreview(tool: AgentMcpToolInterface): void {
    this.selectedPreviewToolIdState.set(tool.id);
    this.facade.clearPreviewResult();
    this.mcpPreviewForm.reset(getMcpPreviewDefaults(tool));
    this.showMcpPreviewModalState.set(true);
  }

  closeMcpPreviewModal(): void {
    this.showMcpPreviewModalState.set(false);
  }

  runMcpPreview(tool: AgentMcpToolInterface): void {
    void this.facade.runMcpPreview(tool.id, buildPreviewArguments(tool, this.mcpPreviewForm.getRawValue()));
  }

  supportsMcpPreview(tool: AgentMcpToolInterface): boolean {
    return tool.supports_preview !== false;
  }

  getFieldLabel(fieldKey: string): string {
    const dataset = this.mcpDatasets.find((d) => d.key === (this.selectedPreviewTool?.dataset_key ?? ''));
    const field = dataset?.fields.find((f) => f.key === fieldKey);
    return field?.label ?? fieldKey;
  }

  supportsPreviewFilter(filterKey: string): boolean {
    return (this.selectedPreviewTool?.allowed_filters ?? []).includes(filterKey);
  }

  isMcpFieldSelected(fieldKey: string): boolean {
    return (this.mcpToolForm.value.allowed_fields ?? []).includes(fieldKey);
  }

  isMcpFilterSelected(filterKey: string): boolean {
    return (this.mcpToolForm.value.allowed_filters ?? []).includes(filterKey);
  }

  isMcpChannelSelected(channelKey: string): boolean {
    return (this.mcpToolForm.value.allowed_channels ?? []).includes(channelKey);
  }

  toggleMcpField(fieldKey: string, checked: boolean): void {
    const current = new Set(this.mcpToolForm.value.allowed_fields ?? []);
    checked ? current.add(fieldKey) : current.delete(fieldKey);
    this.mcpToolForm.patchValue({ allowed_fields: Array.from(current) });
  }

  toggleMcpFilter(filterKey: string, checked: boolean): void {
    const current = new Set(this.mcpToolForm.value.allowed_filters ?? []);
    checked ? current.add(filterKey) : current.delete(filterKey);

    if (!checked) {
      this.mcpToolForm.patchValue(getMcpFilterResetPatch(filterKey));
    }

    this.mcpToolForm.patchValue({ allowed_filters: Array.from(current) });
  }

  toggleMcpChannel(channelKey: string, checked: boolean): void {
    const current = new Set(this.mcpToolForm.value.allowed_channels ?? []);
    checked ? current.add(channelKey) : current.delete(channelKey);
    this.mcpToolForm.patchValue({ allowed_channels: Array.from(current) });
  }

  onMcpDatasetChange(): void {
    this.mcpToolForm.patchValue({
      allowed_fields: [],
      allowed_filters: [],
      default_client_status: '',
      default_lot_status: '',
      default_sale_type: '',
      default_has_phone: false,
      default_has_pending_installments: false,
      default_has_overdue_installments: false,
    });
    this.facade.clearPreviewResult();
  }

  applyMcpPreset(preset: AgentMcpPreset): void {
    this.currentMcpPresetState.set(preset);
    this.mcpToolForm.patchValue(getMcpPresetPatch(preset));
  }

  trackByStep(_: number, item: AgentSetupStepInterface): string {
    return item.key;
  }

  trackByProvider(_: number, item: AgentProviderInterface): string {
    return item.id;
  }

  trackByCredential(_: number, item: AgentCredentialInterface): string {
    return item.id;
  }

  trackByMcpTool(_: number, item: AgentMcpToolInterface): string {
    return item.id;
  }

  trackByRuntimeTool(_: number, tool: AgentRuntimeToolInterface): string {
    return tool.name;
  }

  trackBySession(_: number, session: WhatsappSessionView): string {
    return session.id;
  }

  getStepNumber(step: AgentSetupStepInterface): number {
    return this.setupSteps.findIndex((item) => item.key === step.key) + 1;
  }

  isCurrentStep(step: AgentSetupStepInterface): boolean {
    return this.setupStatus?.next_step === step.key;
  }

  getCredentialLabel(credential: AgentCredentialInterface): string {
    return resolveCredentialLabel(credential);
  }

  getCredentialStatusLabel(credential: AgentCredentialInterface): string {
    return resolveCredentialStatusLabel(credential);
  }

  getCredentialStatusClass(credential: AgentCredentialInterface): string {
    return resolveCredentialStatusClass(credential);
  }

  getCredentialTestMessage(): string {
    return resolveCredentialTestMessage(this.credentialTestResult);
  }

  getChannelLabel(channelKey: string | null | undefined): string {
    if (!channelKey) {
      return 'Sin canal';
    }

    return AGENTLLM_CHANNEL_LABEL_MAP[channelKey] ?? channelKey;
  }

  getToolChannelSummary(tool: { allowed_channels?: string[] | null }): string {
    const channels = tool.allowed_channels ?? [];
    if (!channels || channels.length === 0) {
      return 'Todos los canales';
    }

    return channels.map((channel) => this.getChannelLabel(channel)).join(', ');
  }

  isWhatsappChannelSelected(): boolean {
    return (this.agentForm.value.preferred_channel ?? '') === 'whatsapp';
  }

  getConnectedSessionCount(): number {
    return this.whatsappSessions.filter((session) => session.status === 'connected').length;
  }

  isRuntimeToolCompatibleWithSelectedChannel(tool: AgentRuntimeToolInterface): boolean {
    const selectedChannel = this.playgroundForm.value.channel ?? this.setting?.preferred_channel ?? 'web';
    const allowedChannels = tool.allowed_channels ?? [];

    if (!allowedChannels.length) {
      return true;
    }

    return allowedChannels.includes(selectedChannel);
  }

  private syncFormsAfterLoad(): void {
    const providerId = this.providers[0]?.id ?? null;

    if (!this.showCredentialModal) {
      this.credentialForm.patchValue({
        provider_id: this.selectedCredentialId
          ? this.credentials.find((credential) => credential.id === this.selectedCredentialId)?.provider_id ?? providerId
          : providerId,
      });
    }

    this.agentForm.patchValue({
      agent_enabled: this.setting?.agent_enabled ?? false,
      provider_credential_id: this.setting?.provider_credential_id ?? null,
      preferred_channel: this.setting?.preferred_channel ?? this.channels[0]?.key ?? 'web',
      allowed_whatsapp_session_ids: this.setting?.allowed_whatsapp_session_ids ?? [],
    }, { emitEvent: false });

    if ((this.playgroundForm.value.allowed_tools ?? []).length === 0) {
      this.playgroundForm.patchValue({
        allowed_tools: this.runtimeTools
          .filter((tool) => this.isRuntimeToolCompatibleWithSelectedChannel(tool))
          .map((tool) => tool.name),
      }, { emitEvent: false });
    }

    this.playgroundForm.patchValue({
      channel: this.playgroundForm.value.channel || this.setting?.preferred_channel || this.channels[0]?.key || 'web',
    }, { emitEvent: false });

    this.ensureMcpDatasetSelection();
  }

  private resetMcpToolForm(): void {
    this.selectedMcpToolIdState.set(null);
    this.mcpToolForm.reset({
      name: '',
      slug: '',
      description: '',
      dataset_key: this.mcpDatasets[0]?.key ?? 'client_portfolio',
      max_results: 25,
      allow_phone_targeting: true,
      is_active: true,
      allowed_channels: this.channels.length > 0 ? [this.channels[0].key] : [],
      allowed_fields: [],
      allowed_filters: [],
      default_client_status: '',
      default_lot_status: '',
      default_sale_type: '',
      default_has_phone: false,
      default_installment_status: '',
      default_has_pending_installments: false,
      default_has_overdue_installments: false,
    });
    this.showMcpAdvancedOptionsState.set(false);
    this.facade.clearPreviewResult();
  }

  private resetCredentialForm(): void {
    this.selectedCredentialIdState.set(null);
    this.credentialForm.reset({
      provider_id: this.providers[0]?.id ?? null,
      alias: '',
      api_key: '',
      is_active: true,
    });
  }

  private ensureMcpDatasetSelection(): void {
    if (!this.mcpToolForm.value.dataset_key && this.mcpDatasets.length > 0) {
      this.mcpToolForm.patchValue({ dataset_key: this.mcpDatasets[0].key });
    }
  }

  private setupMcpToolFormState(): void {
    this.mcpToolForm.get('name')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        if (!name || this.selectedMcpToolId) {
          return;
        }

        this.mcpToolForm.get('slug')?.setValue(generateSlug(name), { emitEvent: false });
      });
  }

  toggleMcpAdvancedOptions(): void {
    this.showMcpAdvancedOptionsState.update((current) => !current);
  }

  private async handleDeleteCredential(id: string): Promise<void> {
    const deleted = await this.facade.deleteCredential(id);
    this.confirmService.close();
    if (deleted) {
      if (this.selectedCredentialId === id) {
        this.closeCredentialModal();
      }
      this.syncFormsAfterLoad();
    }
  }

  private async handleDeleteMcpTool(id: string): Promise<void> {
    const deleted = await this.facade.deleteMcpTool(id);
    this.confirmService.close();
    if (deleted) {
      if (this.selectedMcpToolId === id) {
        this.closeMcpToolModal();
      }
      this.syncFormsAfterLoad();
    }
  }
}
