/**
 * Utilidades para manejo de strings
 */

/**
 * Normaliza un string opcional:
 * - Si el string está vacío, null o undefined, devuelve null
 * - Si no, devuelve el string trimmeado
 */
export function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim();
  return normalized === '' ? null : normalized;
}

/**
 * Genera un slug a partir de un nombre
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Convierte un valor array o booleano a string para filtros por defecto
 */
export function stringifyDefaultFilter(value: string[] | boolean | undefined): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return '';
}
