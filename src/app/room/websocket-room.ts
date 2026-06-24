const GENERAL_USER_ROOM_PREFIX = 'system.user.';
const AGENTLLM_FLOW_RUN_ROOM_PREFIX = 'agentllm.flow.run.';
const AGENTLLM_FLOW_USER_ROOM_PREFIX = 'agentllm.flow.user.';
const WHATSAPP_SESSION_ROOM_PREFIX = 'whatsapp.session.';
const PORTFOLIO_ALERT_COLLECTOR_ROOM_PREFIX = 'portfolio.alerts.collector.';

function normalizeRoomSegment(value: string | number): string {
  return String(value).trim();
}

export const websocketRoom = {
  generalUser(userId: string): string {
    return `${GENERAL_USER_ROOM_PREFIX}${normalizeRoomSegment(userId)}`;
  },
  agentLlmFlowRun(runId: string): string {
    return `${AGENTLLM_FLOW_RUN_ROOM_PREFIX}${normalizeRoomSegment(runId)}`;
  },
  agentLlmFlowUser(userId: string): string {
    return `${AGENTLLM_FLOW_USER_ROOM_PREFIX}${normalizeRoomSegment(userId)}`;
  },
  whatsappSession(sessionId: string): string {
    return `${WHATSAPP_SESSION_ROOM_PREFIX}${normalizeRoomSegment(sessionId)}`;
  },
  portfolioAlertCollector(userId: string): string {
    return `${PORTFOLIO_ALERT_COLLECTOR_ROOM_PREFIX}${normalizeRoomSegment(userId)}`;
  },
} as const;
