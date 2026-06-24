import {
  AgentCredentialInterface,
  AgentCredentialTestResultInterface,
  AgentMcpToolInterface,
  AgentSetupStepInterface,
  UpsertAgentMcpToolPayload,
} from '@/app/interfaces/agentllm-admin.interface';
import { normalizeOptionalString, stringifyDefaultFilter } from '@/app/shared/utils/string.utils';

export type AgentMcpPreset = 'clients' | 'messaging' | 'installments' | 'admin_portfolio' | 'whatsapp_action' | 'cron_jobs';

export interface AgentMcpToolFormValue {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  dataset_key?: string | null;
  max_results?: number | null;
  allow_phone_targeting?: boolean | null;
  is_active?: boolean | null;
  allowed_channels?: string[] | null;
  allowed_fields?: string[] | null;
  allowed_filters?: string[] | null;
  default_client_status?: string | null;
  default_lot_status?: string | null;
  default_sale_type?: string | null;
  default_has_phone?: boolean | null;
  default_installment_status?: string | null;
  default_has_pending_installments?: boolean | null;
  default_has_overdue_installments?: boolean | null;
}

export interface AgentMcpPreviewFormValue {
  search?: string | null;
  limit?: number | null;
  client_status?: string | null;
  lot_status?: string | null;
  sale_type?: string | null;
  installment_status?: string | null;
  has_phone?: boolean | null;
  has_pending_installments?: boolean | null;
  has_overdue_installments?: boolean | null;
}

export function getCompletedSteps(steps: AgentSetupStepInterface[]): number {
  return steps.filter((step) => step.completed).length;
}

export function getProgressPercent(steps: AgentSetupStepInterface[]): number {
  return steps.length > 0 ? Math.round((getCompletedSteps(steps) / steps.length) * 100) : 0;
}

export function getNextStep(steps: AgentSetupStepInterface[]): AgentSetupStepInterface | null {
  return steps.find((step) => !step.completed) ?? null;
}

export function getCredentialLabel(credential: AgentCredentialInterface): string {
  const alias = credential.alias?.trim();
  const name = alias || credential.provider_name || credential.api_key_masked;
  return credential.is_active ? name : `${name} (inactiva)`;
}

export function getCredentialStatusLabel(credential: AgentCredentialInterface): string {
  if (credential.last_test_status === 'success') {
    return 'Probada';
  }

  if (credential.last_test_status === 'error') {
    return 'Con error';
  }

  return 'Sin prueba';
}

export function getCredentialStatusClass(credential: AgentCredentialInterface): string {
  return credential.last_test_status === 'success' ? 'badge-active' : 'badge-inactive';
}

export function getCredentialTestMessage(testResult: AgentCredentialTestResultInterface | null): string {
  return testResult?.result?.message ? String(testResult.result.message) : 'Sin detalle adicional del proveedor.';
}

export function getMcpPresetPatch(preset: AgentMcpPreset): Partial<AgentMcpToolFormValue> {
  if (preset === 'clients') {
    return {
      name: 'Resumen de clientes',
      slug: 'resumen_clientes',
      description: 'Consulta clientes y contratos con foco en identificacion general y estado.',
      dataset_key: 'client_portfolio',
      allowed_channels: ['web', 'docs'],
      allowed_fields: ['full_name', 'client_status', 'contract_code', 'lot', 'lot_status'],
      allowed_filters: ['client_status', 'lot_status'],
      allow_phone_targeting: false,
    };
  }

  if (preset === 'messaging') {
    return {
      name: 'Clientes para WhatsApp',
      slug: 'clientes_para_whatsapp',
      description: 'Busca clientes contactables por WhatsApp con telefono disponible y contexto basico.',
      dataset_key: 'client_portfolio',
      allowed_channels: ['whatsapp'],
      allowed_fields: ['full_name', 'phone', 'client_status', 'contract_code', 'lot', 'lot_status'],
      allowed_filters: ['client_status', 'lot_status', 'has_phone'],
      allow_phone_targeting: true,
      default_has_phone: true,
    };
  }

  if (preset === 'admin_portfolio') {
    return {
      name: 'Cartera Admin',
      slug: 'cartera_admin',
      description: 'Herramienta estructurada para pruebas admin sobre cartera completa, estados de cliente, lotes y cobranza.',
      dataset_key: 'client_portfolio',
      allowed_channels: ['web', 'docs', 'whatsapp'],
      allowed_fields: [
        'full_name',
        'phone',
        'email',
        'client_status',
        'contract_code',
        'lot',
        'lot_status',
        'sale_type',
        'pending_installments',
        'overdue_installments',
        'next_due_date',
        'assigned_user_name',
      ],
      allowed_filters: ['client_status', 'lot_status', 'has_phone', 'has_pending_installments', 'has_overdue_installments'],
      allow_phone_targeting: true,
      default_has_phone: true,
    };
  }

  if (preset === 'whatsapp_action') {
    return {
      name: 'WhatsApp Accion',
      slug: 'whatsapp_accion',
      description: 'Herramienta de accion para enviar mensajes reales por WhatsApp usando una sesion y chat autorizados.',
      dataset_key: 'whatsapp_dispatch',
      allowed_channels: ['whatsapp'],
      allowed_fields: ['session_id', 'chat_id', 'client_id', 'text', 'delivery_status', 'dispatched_at'],
      allowed_filters: [],
      allow_phone_targeting: false,
    };
  }

  if (preset === 'cron_jobs') {
    return {
      name: 'Cron Jobs',
      slug: 'cron_jobs',
      description: 'Herramienta para programar activaciones del agente por chat y canal especificos sin definir el mensaje final.',
      dataset_key: 'channel_activation_scheduler',
      allowed_channels: ['web', 'cron'],
      allowed_fields: ['id', 'name', 'channel', 'whatsapp_session_id', 'chat_id', 'client_id', 'objective', 'cron_expression', 'timezone', 'next_run_at', 'is_active'],
      allowed_filters: [],
      allow_phone_targeting: false,
    };
  }

  return {
    name: 'Revision de cuotas',
    slug: 'revision_cuotas',
    description: 'Consulta cuotas pendientes, vencidas y fechas clave del contrato.',
    dataset_key: 'client_portfolio',
    allowed_channels: ['web', 'docs', 'whatsapp'],
    allowed_fields: [
      'full_name',
      'phone',
      'contract_code',
      'installment_count',
      'paid_installments',
      'pending_installments',
      'overdue_installments',
      'next_due_date',
      'last_payment_date',
    ],
    allowed_filters: ['installment_status', 'has_phone', 'has_pending_installments', 'has_overdue_installments'],
    allow_phone_targeting: true,
    default_has_phone: true,
    default_has_pending_installments: true,
  };
}

export function getMcpFilterResetPatch(filterKey: string): Partial<AgentMcpToolFormValue> {
  switch (filterKey) {
    case 'client_status':
      return { default_client_status: '' };
    case 'lot_status':
      return { default_lot_status: '' };
    case 'sale_type':
      return { default_sale_type: '' };
    case 'has_phone':
      return { default_has_phone: false };
    case 'installment_status':
      return { default_installment_status: '' };
    case 'has_pending_installments':
      return { default_has_pending_installments: false };
    case 'has_overdue_installments':
      return { default_has_overdue_installments: false };
    default:
      return {};
  }
}

export function getMcpPreviewDefaults(tool: AgentMcpToolInterface): AgentMcpPreviewFormValue {
  return {
    search: '',
    limit: tool.max_results,
    client_status: stringifyDefaultFilter(tool.default_filters['client_status']),
    lot_status: stringifyDefaultFilter(tool.default_filters['lot_status']),
    sale_type: stringifyDefaultFilter(tool.default_filters['sale_type']),
    installment_status: stringifyDefaultFilter(tool.default_filters['installment_status']),
    has_phone: tool.default_filters['has_phone'] === true,
    has_pending_installments: tool.default_filters['has_pending_installments'] === true,
    has_overdue_installments: tool.default_filters['has_overdue_installments'] === true,
  };
}

export function buildMcpPayloadFromValue(
  formValue: AgentMcpToolFormValue,
): { payload: UpsertAgentMcpToolPayload | null; error: string | null } {
  const allowedFields = formValue.allowed_fields ?? [];
  const allowedChannels = formValue.allowed_channels ?? [];
  if (allowedFields.length === 0) {
    return {
      payload: null,
      error: 'Selecciona al menos un campo permitido para la MCP.',
    };
  }

  if (allowedChannels.length === 0) {
    return {
      payload: null,
      error: 'Selecciona al menos un canal permitido para la MCP.',
    };
  }

  const selectedFilters = formValue.allowed_filters ?? [];
  const defaultFilters: Record<string, string | boolean> = {};

  if (selectedFilters.includes('client_status') && (formValue.default_client_status ?? '').trim() !== '') {
    defaultFilters['client_status'] = (formValue.default_client_status ?? '').trim();
  }

  if (selectedFilters.includes('lot_status') && (formValue.default_lot_status ?? '').trim() !== '') {
    defaultFilters['lot_status'] = (formValue.default_lot_status ?? '').trim();
  }

  if (selectedFilters.includes('sale_type') && (formValue.default_sale_type ?? '').trim() !== '') {
    defaultFilters['sale_type'] = (formValue.default_sale_type ?? '').trim();
  }

  if (selectedFilters.includes('has_phone')) {
    defaultFilters['has_phone'] = formValue.default_has_phone ?? false;
  }

  if (selectedFilters.includes('installment_status') && (formValue.default_installment_status ?? '').trim() !== '') {
    defaultFilters['installment_status'] = (formValue.default_installment_status ?? '').trim();
  }

  if (selectedFilters.includes('has_pending_installments')) {
    defaultFilters['has_pending_installments'] = formValue.default_has_pending_installments ?? false;
  }

  if (selectedFilters.includes('has_overdue_installments')) {
    defaultFilters['has_overdue_installments'] = formValue.default_has_overdue_installments ?? false;
  }

  return {
    payload: {
      name: (formValue.name ?? '').trim(),
      slug: normalizeOptionalString(formValue.slug),
      description: normalizeOptionalString(formValue.description),
      dataset_key: formValue.dataset_key ?? 'client_portfolio',
      allowed_channels: allowedChannels,
      allowed_fields: allowedFields,
      allowed_filters: selectedFilters,
      default_filters: defaultFilters,
      max_results: formValue.max_results ?? 25,
      allow_phone_targeting: formValue.allow_phone_targeting ?? true,
      is_active: formValue.is_active ?? true,
    },
    error: null,
  };
}

export function buildPreviewArguments(
  tool: AgentMcpToolInterface,
  preview: AgentMcpPreviewFormValue,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const search = (preview.search ?? '').trim();

  if (search !== '') {
    args['search'] = search;
  }

  const requestedLimit = preview.limit ?? tool.max_results;
  if (requestedLimit) {
    args['limit'] = Math.min(requestedLimit, tool.max_results);
  }

  const stringFilters: Array<keyof AgentMcpPreviewFormValue> = [
    'client_status',
    'lot_status',
    'sale_type',
    'installment_status',
  ];

  for (const filterKey of stringFilters) {
    if (!tool.allowed_filters.includes(filterKey)) {
      continue;
    }

    const value = (preview[filterKey] ?? '').toString().trim();
    if (value !== '') {
      args[filterKey] = value;
    }
  }

  const booleanFilters: Array<'has_phone' | 'has_pending_installments' | 'has_overdue_installments'> = [
    'has_phone',
    'has_pending_installments',
    'has_overdue_installments',
  ];

  for (const filterKey of booleanFilters) {
    if (!tool.allowed_filters.includes(filterKey)) {
      continue;
    }

    if (preview[filterKey]) {
      args[filterKey] = true;
    }
  }

  return args;
}
