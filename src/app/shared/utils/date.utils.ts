/**
 * Utilidades para manejo de fechas
 */

/**
 * Convierte una fecha Date a un string en formato YYYY-MM-DD (para inputs type date)
 */
export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha en formato ISO o YYYY-MM-DD a DD/MM/YYYY
 */
export function formatDateToDisplay(dateString: string): string {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-');
  
  if (!year || !month || !day) {
    return dateString;
  }
  
  return `${day}/${month}/${year}`;
}
