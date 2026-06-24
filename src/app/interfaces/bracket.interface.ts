export interface BracketInterface {
  id: string;
  name: string;
  min_days: number;
  max_days: number;
  color: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertBracketPayloadInterface {
  name: string;
  min_days: number;
  max_days: number;
  color: string | null;
  is_default: boolean;
  is_active: boolean;
}
