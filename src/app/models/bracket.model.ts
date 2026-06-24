
export class BracketModel {
  constructor(
  public id: string = '',
  public name: string = '',
  public min_days: number = 0,
  public max_days: number = 0,
  public color: string | null = null,
  public is_default: boolean = false,
  public is_active: boolean = true,
  public created_by: string | null = null,
  public created_at: string | null = null,
  public updated_at: string | null = null,
  ) {}

  static fromJson(json: any): BracketModel {
    return new BracketModel(
      json.id ?? '',
      json.name ?? '',
      json.min_days ?? 0,
      json.max_days ?? 0,
      json.color ?? null,
      json.is_default ?? false,
      json.is_active ?? true,
      json.created_by ?? null,
      json.created_at ?? null,
      json.updated_at ?? null,
    );
  }

  toJson(type: 'full' | 'upsert' = 'full'): any {
    if (type === 'upsert') {
      return {
        name: this.name,
        min_days: this.min_days,
        max_days: this.max_days,
        color: this.color,
        is_default: this.is_default,
        is_active: this.is_active,
      };
    }

    return {
      id: this.id,
      name: this.name,
      min_days: this.min_days,
      max_days: this.max_days,
      color: this.color,
      is_default: this.is_default,
      is_active: this.is_active,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
