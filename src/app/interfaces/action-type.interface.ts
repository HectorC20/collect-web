export interface ActionTypeInterface {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertActionTypePayloadInterface {
  code: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}
