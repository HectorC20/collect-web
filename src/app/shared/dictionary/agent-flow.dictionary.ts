export const AGENT_FLOW_EVENT_LABELS: Record<string, string> = {
  'agentllm.flow.started': 'Flujo iniciado',
  'agentllm.flow.step_started': 'Paso',
  'agentllm.flow.tool_called': 'Invocando herramienta',
  'agentllm.flow.tool_result': 'Resultado de herramienta',
  'agentllm.flow.completed': 'Flujo completado',
  'agentllm.flow.failed': 'Flujo con error',
};

export const AGENT_FLOW_EVENT_TONES: Record<string, 'info' | 'success' | 'danger' | 'neutral'> = {
  'agentllm.flow.started': 'neutral',
  'agentllm.flow.step_started': 'neutral',
  'agentllm.flow.tool_called': 'neutral',
  'agentllm.flow.tool_result': 'info',
  'agentllm.flow.completed': 'success',
  'agentllm.flow.failed': 'danger',
};
