import { AgentLlmViewMachine } from '@/app/interfaces/agentllm-state.interface';

export const AGENT_LLM_INITIAL_STATE: AgentLlmViewMachine = {
  page: 'loading',
  modals: {
    provider: 'closed',
    mcpTool: 'closed',
    credential: 'closed',
    mcpPreview: 'closed',
  },
  operations: {
    provider: 'idle',
    mcpTool: 'idle',
    credential: 'idle',
    access: 'idle',
    runtimeTools: 'idle',
    preview: 'idle',
    credentialTest: 'idle',
    deletingMcpTool: 'idle',
    deletingCredential: 'idle',
  },
  flow: {
    phase: 'idle',
    connection: 'disconnected',
    runId: null,
  },
};
