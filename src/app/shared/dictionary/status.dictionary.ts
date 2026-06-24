export interface StatusDictionaryEntry {
  label: string;
  background: string;
  color: string;
  borderColor: string;
}

const DEFAULT_STATUS_ENTRY: StatusDictionaryEntry = {
  label: 'Desconocido',
  background: '#e2e8f0',
  color: '#334155',
  borderColor: '#cbd5e1',
};

// --- Estado de Cliente ---
export const CLIENT_STATUS = {
  ACTIVO: 'activo',
  DESISTIO: 'desistio',
  PENDIENTE_VALIDACION: 'pendiente_validacion',
  INACTIVO: 'inactivo',
} as const;

export const CLIENT_STATUS_DICTIONARY: Record<string, StatusDictionaryEntry> = {
  [CLIENT_STATUS.ACTIVO]: {
    label: 'Activo',
    background: '#dcfce7',
    color: '#15803d',
    borderColor: '#86efac',
  },
  [CLIENT_STATUS.DESISTIO]: {
    label: 'Desistió',
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
  },
  [CLIENT_STATUS.PENDIENTE_VALIDACION]: {
    label: 'Pendiente de Validación',
    background: '#fffbeb',
    color: '#92400e',
    borderColor: '#fed7aa',
  },
  [CLIENT_STATUS.INACTIVO]: {
    label: 'Inactivo',
    background: '#f3f4f6',
    color: '#4b5563',
    borderColor: '#d1d5db',
  },
};

// --- Estado de Lote ---
export const LOT_STATUS = {
  ACTIVO: 'activo',
  RESUELTO: 'resuelto',
  BLOQUEADO: 'bloqueado',
} as const;

export const LOT_STATUS_DICTIONARY: Record<string, StatusDictionaryEntry> = {
  [LOT_STATUS.ACTIVO]: {
    label: 'Activo',
    background: '#dcfce7',
    color: '#15803d',
    borderColor: '#86efac',
  },
  [LOT_STATUS.RESUELTO]: {
    label: 'Resuelto',
    background: '#dbeafe',
    color: '#1d4ed8',
    borderColor: '#93c5fd',
  },
  [LOT_STATUS.BLOQUEADO]: {
    label: 'Bloqueado',
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
  },
};

export function getClientStatusEntry(statusName?: string | null): StatusDictionaryEntry {
  const normalizedName = (statusName ?? '').trim().toLowerCase();
  return CLIENT_STATUS_DICTIONARY[normalizedName] ?? {
    ...DEFAULT_STATUS_ENTRY,
    label: statusName?.trim() || DEFAULT_STATUS_ENTRY.label,
  };
}

export function getLotStatusEntry(statusName?: string | null): StatusDictionaryEntry {
  const normalizedName = (statusName ?? '').trim().toLowerCase();
  return LOT_STATUS_DICTIONARY[normalizedName] ?? {
    ...DEFAULT_STATUS_ENTRY,
    label: statusName?.trim() || DEFAULT_STATUS_ENTRY.label,
  };
}
