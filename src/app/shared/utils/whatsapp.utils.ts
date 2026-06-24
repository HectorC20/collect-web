// whatsapp.utils.ts
import { WhatsappSessionView } from '../../interfaces/whatsappconversation.interface';
import { DEFAULT_SESSION_FORM } from '../../shared/dictionary/main';
// 2. Funciones de UI puras
export function getSessionStatusClass(status: WhatsappSessionView['status']): string {
  switch (status) {
    case 'connected': return 'status-connected';
    case 'qr_pending': return 'status-qr';
    case 'connecting': return 'status-pending';
    case 'disconnected': return 'status-danger';
    case 'logged_out': return 'status-danger';
    default: return 'status-muted';
  }
}

export function getSessionStatusLabel(status: WhatsappSessionView['status']): string {
  switch (status) {
    case 'connected': return 'Conectado';
    case 'qr_pending': return 'Pendiente de QR';
    case 'connecting': return 'Conectando';
    case 'disconnected': return 'Desconectado';
    case 'logged_out': return 'Desconectado';
    default: return 'Desconocido';
  }
}

export function isSessionConnected(session: WhatsappSessionView | null | undefined): boolean {
  return !!session && session.status === 'connected';
}

export function canDisconnectSession(session: WhatsappSessionView | null | undefined): boolean {
  if (!session) {
    return false;
  }

  return ['connected', 'connecting', 'qr_pending'].includes(session.status);
}

export function getMessageStatusIcon(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case 'read': return 'done_all';
    case 'delivered': return 'done_all';
    case 'sent': return 'done';
    default: return 'schedule';
  }
}

// 3. Extracción de errores genérica
export function extractErrorMessage(error: unknown, fallback?: string): string {
  const candidate = error as { 
    error?: { 
      message?: string;
      errors?: Record<string, unknown>;
    }; 
    message?: string 
  };
  
  // Si hay errores en array, los juntamos
  if (candidate?.error?.errors) {
    const errors = candidate.error.errors;
    const messages = Object.values(errors)
      .flat()
      .filter(Boolean)
      .map(String);
    if (messages.length > 0) {
      return messages.join(', ');
    }
  }
  
  return candidate?.error?.message || candidate?.message || fallback || 'No se pudo completar la operación.';
}
