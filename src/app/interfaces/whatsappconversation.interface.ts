export type WhatsappSessionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'connected'
  | 'logged_out';

export interface WhatsappClientSummary {
  id: string;
  full_name: string;
  dni: string;
  phone: string | null;
  phone_history?: string[] | null;
  email: string | null;
  status?: string | null;
  assigned_user_name?: string | null;
  current_bracket?: {
    id: string | null;
    name: string | null;
    color: string | null;
  } | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  department?: string | null;
}

export interface WhatsappSessionView {
  id: string;
  name: string;
  user_id: string | null;
  assigned_user: WhatsappSessionLinkedUser | null;
  authorized_users: WhatsappSessionLinkedUser[];
  status: WhatsappSessionStatus | string;
  phone_number: string | null;
  push_name: string | null;
  qr_code: string | null;
  qr_expires_at: string | null;
  is_active: boolean;
  ai_enabled: boolean;
  ignore_groups: boolean;
  ignore_status: boolean;
  last_connected_at: string | null;
  last_seen_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  stats: {
    chat_count: number;
    message_count: number;
    unread_count: number;
  };
  created_at: string | null;
  updated_at: string | null;
}

export interface WhatsappSessionLinkedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_name: string | null;
}

export interface WhatsappChatView {
  id: string;
  session_id: string;
  remote_jid: string;
  display_name: string | null;
  phone_number: string | null;
  chat_type: string;
  is_group: boolean;
  is_status: boolean;
  unread_count: number;
  last_message_text: string | null;
  last_message_direction: 'in' | 'out' | string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  client: WhatsappClientSummary | null;
}

export interface WhatsappClientContactView {
  client: WhatsappClientSummary;
  linked_chat_id: string | null;
}

export interface WhatsappMessageView {
  id: string;
  session_id: string;
  chat_id: string;
  message_id: string | null;
  remote_jid: string;
  sender_jid: string | null;
  direction: 'in' | 'out' | string;
  message_type: string;
  content: string | null;
  status: string | null;
  is_from_ai: boolean;
  requires_human: boolean;
  raw_payload: Record<string, unknown>;
  sent_at: string | null;
  created_at: string | null;
}

export interface WhatsappOverviewView {
  sessions: WhatsappSessionView[];
  active_session_id: string | null;
  chats: WhatsappChatView[];
  contacts: WhatsappClientContactView[];
  active_chat_id: string | null;
  messages: WhatsappMessageView[];
}

export interface WhatsappMessageHistoryView {
  session_id: string;
  chat_id: string | null;
  range: {
    from: string;
    to: string;
  };
  messages: WhatsappMessageView[];
}

export interface UpsertWhatsappSessionPayload {
  name?: string;
  ai_enabled?: boolean;
  ignore_groups?: boolean;
  ignore_status?: boolean;
  is_active?: boolean;
  user_id?: string | null;
  authorized_user_ids?: string[];
}

export interface WhatsappSendMessageResponse {
  message: string;
  chat: WhatsappChatView;
  gateway?: Record<string, unknown>;
}
