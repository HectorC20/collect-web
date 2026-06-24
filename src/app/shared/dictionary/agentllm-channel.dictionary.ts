import { AgentChannelOptionInterface } from '@/app/interfaces/agentllm-admin.interface';

export const AGENTLLM_CHANNEL_WEB = 'web';
export const AGENTLLM_CHANNEL_WHATSAPP = 'whatsapp';
export const AGENTLLM_CHANNEL_DOCS = 'docs';
export const AGENTLLM_CHANNEL_CRON = 'cron';

export const AGENTLLM_CHANNEL_OPTIONS: AgentChannelOptionInterface[] = [
  {
    key: AGENTLLM_CHANNEL_WEB,
    label: 'Web',
    description: 'Pruebas y conversaciones generales desde la interfaz web.',
    supports_whatsapp_session: false,
  },
  {
    key: AGENTLLM_CHANNEL_WHATSAPP,
    label: 'WhatsApp',
    description: 'Agente orientado a mensajes y sesiones de WhatsApp.',
    supports_whatsapp_session: true,
  },
  {
    key: AGENTLLM_CHANNEL_DOCS,
    label: 'Docs',
    description: 'Consultas orientadas a documentacion y contexto escrito.',
    supports_whatsapp_session: false,
  },
  {
    key: AGENTLLM_CHANNEL_CRON,
    label: 'Cron Jobs',
    description: 'Activaciones programadas y ejecuciones automaticas del agente.',
    supports_whatsapp_session: true,
  },
];

export const AGENTLLM_CHANNEL_LABEL_MAP = AGENTLLM_CHANNEL_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});
