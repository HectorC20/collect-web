export interface AgentProviderInterface {
  id: string;
  slug: string;
  name: string;
  driver: string;
  supports_tools: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AgentCredentialInterface {
  id: string;
  alias: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  provider_id: string;
  provider_slug: string | null;
  provider_name: string | null;
  model_name?: string | null;
  base_url_override?: string | null;
  is_active: boolean;
  api_key_masked: string;
  last_test_status: string | null;
  last_test_message: string | null;
  last_tested_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AgentUserSettingInterface {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  agent_enabled: boolean;
  provider_credential_id: string | null;
  credential_alias: string | null;
  provider_name: string | null;
  model_provider?: string | null;
  model_name?: string | null;
  use_default_model?: boolean;
  preferred_channel?: string | null;
  allowed_whatsapp_session_ids: string[];
  allowed_whatsapp_sessions: Array<{
    id: string;
    name: string;
    phone_number: string | null;
    push_name: string | null;
    status: string | null;
  }>;
  updated_at: string | null;
}

export interface AgentChannelOptionInterface {
  key: string;
  label: string;
  description: string;
  supports_whatsapp_session: boolean;
}

export interface AgentSetupStepInterface {
  key: string;
  label: string;
  description: string;
  completed: boolean;
}

export interface AgentSetupStatusInterface {
  user_id: string;
  steps: AgentSetupStepInterface[];
  next_step: string | null;
  summary: {
    active_credentials: number;
    tested_credentials: number;
    mcp_tools: number;
    selected_credential_id: string | null;
    whatsapp_sessions: number;
    agent_enabled: boolean;
  };
}

export interface AgentCredentialTestResultInterface {
  ok: boolean;
  result: {
    message?: string;
    [key: string]: unknown;
  };
  credential: AgentCredentialInterface;
}

export interface AgentMcpDatasetOptionInterface {
  key: string;
  name: string;
  description: string;
  kind?: string;
  supports_preview?: boolean;
  fields: Array<{
    key: string;
    label: string;
    description: string;
  }>;
  filters: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
}

export interface AgentMcpToolInterface {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  dataset_key: string;
  dataset_name: string;
  tool_kind?: string;
  supports_preview?: boolean;
  allowed_channels: string[];
  allowed_fields: string[];
  allowed_filters: string[];
  default_filters: Record<string, string[] | boolean>;
  max_results: number;
  allow_phone_targeting: boolean;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertAgentMcpToolPayload {
  name: string;
  slug?: string | null;
  description?: string | null;
  dataset_key: string;
  allowed_channels: string[];
  allowed_fields: string[];
  allowed_filters: string[];
  default_filters: Record<string, string | boolean>;
  max_results: number;
  allow_phone_targeting: boolean;
  is_active: boolean;
}

export interface AgentMcpPreviewResponseInterface {
  ok: boolean;
  tool: string;
  count: number;
  records: Array<Record<string, unknown>>;
  phone_targets: string[];
  text: string;
}

export interface AgentRuntimeToolInterface {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  allowed_channels?: string[];
  kind?: string;
  supports_preview?: boolean;
}

export interface AgentToolExecutionInterface {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  status: string;
  execution_time_ms: number;
}

export interface AgentFlowEventInterface {
  id?: string;
  channel?: string;
  type: string;
  namespace?: string;
  occurred_at?: string;
  payload: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface AgentFlowTestPayload {
  run_id: string;
  user_id: string;
  prompt: string;
  session_id?: string | null;
  channel?: string;
  allowed_tools: string[];
}

export interface AgentFlowTestResponseInterface {
  run_id: string;
  response: string;
  session_id: string | null;
  channel: string;
  tools_used: string[];
  tool_executions: AgentToolExecutionInterface[];
  token_usage: Record<string, unknown>;
  model: string | null;
  execution_time_ms: number;
}

export interface UpsertAgentProviderPayload {
  name: string;
  driver: string;
  is_active: boolean;
}

export interface UpsertAgentCredentialPayload {
  user_id?: string;
  provider_id: string;
  alias: string | null;
  api_key?: string;
  is_active: boolean;
}

export interface UpsertAgentUserSettingPayload {
  agent_enabled: boolean;
  provider_credential_id: string | null;
  preferred_channel?: string | null;
  allowed_whatsapp_session_ids: string[];
}

export interface AgentPlaygroundPayload {
  prompt: string;
  session_id?: string | null;
  channel?: string | null;
  allowed_tools: string[];
}

export interface AgentPlaygroundResponseInterface {
  run_id: string;
  response: string;
  session_id: string | null;
  channel: string;
  tools_used: string[];
  tool_executions: AgentToolExecutionInterface[];
  token_usage: Record<string, unknown>;
  model: string | null;
  execution_time_ms: number;
}
