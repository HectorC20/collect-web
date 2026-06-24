export interface SystemParameterInterface {
  id: string;
  group: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertSystemParameterPayloadInterface {
  group: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
}
