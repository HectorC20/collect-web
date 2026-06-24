/**
 * Utilidades para manejo de formularios y estados de UI
 */

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * TrackBy function para listas de items con id
 */
export function trackById<T extends { id: string | number }>(_: number, item: T): string | number {
  return item.id;
}

/**
 * Interfaz base para feedback mensajes
 */
export interface FeedbackState {
  feedback: string | null;
  error: string | null;
}

/**
 * Limpia los mensajes de feedback
 */
export function clearFeedback(state: FeedbackState): void {
  state.feedback = null;
  state.error = null;
}
