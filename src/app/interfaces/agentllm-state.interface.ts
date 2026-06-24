export type AgentLlmModalMode = 'closed' | 'create' | 'edit';
export type AgentLlmPreviewMode = 'closed' | 'open';
export type AgentLlmViewState = 'loading' | 'ready' | 'error';
export type AgentLlmOperationState = 'idle' | 'pending';
export type AgentLlmFlowPhase = 'idle' | 'connecting' | 'running' | 'completed' | 'failed';
export type AgentLlmFlowConnectionState = 'disconnected' | 'connected';

export interface AgentLlmViewMachine {
  page: AgentLlmViewState;
  modals: {
    provider: AgentLlmModalMode;
    mcpTool: AgentLlmModalMode;
    credential: AgentLlmModalMode;
    mcpPreview: AgentLlmPreviewMode;
  };
  operations: {
    provider: AgentLlmOperationState;
    mcpTool: AgentLlmOperationState;
    credential: AgentLlmOperationState;
    access: AgentLlmOperationState;
    runtimeTools: AgentLlmOperationState;
    preview: AgentLlmOperationState;
    credentialTest: AgentLlmOperationState;
    deletingMcpTool: AgentLlmOperationState;
    deletingCredential: AgentLlmOperationState;
  };
  flow: {
    phase: AgentLlmFlowPhase;
    connection: AgentLlmFlowConnectionState;
    runId: string | null;
  };
}

export type AgentLlmModalKey = Exclude<keyof AgentLlmViewMachine['modals'], 'mcpPreview'>;
export type AgentLlmOperationKey = keyof AgentLlmViewMachine['operations'];

export interface AgentLlmOperationConfig<T> {
  errorMessage: string;
  successMessage?: string;
  clearMessages?: boolean;
  onSuccess?: (result: T) => void;
  onError?: (message: string) => void;
  onFinalize?: () => void;
}
