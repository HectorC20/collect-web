export interface RoleDictionaryEntry {
  label: string;
  background: string;
  color: string;
  borderColor: string;
}

const DEFAULT_ROLE_ENTRY: RoleDictionaryEntry = {
  label: 'Sin rol',
  background: '#e2e8f0',
  color: '#334155',
  borderColor: '#cbd5e1',
};

export const ROLE_DICTIONARY: Record<string, RoleDictionaryEntry> = {
  admin: {
    label: 'Administrador',
    background: '#dbeafe',
    color: '#1d4ed8',
    borderColor: '#93c5fd',
  },
  collector: {
    label: 'Cobrador',
    background: '#dcfce7',
    color: '#15803d',
    borderColor: '#86efac',
  },
  super_collector: {
    label: 'Supervisor de Cobranza',
    background: '#f3e8ff',
    color: '#7e22ce',
    borderColor: '#d8b4fe',
  },
};

export function getRoleDictionaryEntry(roleName?: string | null): RoleDictionaryEntry {
  const normalizedName = (roleName ?? '').trim().toLowerCase();

  return ROLE_DICTIONARY[normalizedName] ?? {
    ...DEFAULT_ROLE_ENTRY,
    label: roleName?.trim() || DEFAULT_ROLE_ENTRY.label,
  };
}
