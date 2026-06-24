import { RoleInterface } from '../interfaces/role.interface';

export interface UserBracketAccessItem {
  id: string;
  name: string;
  color: string | null;
}

export class UserModel {
  constructor(
    public id: string = '',
    public roleId: string = '',
    public role: RoleInterface | null = null,
    public portfolio_access_scope: 'all_clients' | 'assigned_brackets' = 'assigned_brackets',
    public brackets: UserBracketAccessItem[] = [],
    public dni: string | null = null,
    public full_name: string = '',
    public email: string = '',
    public phone: string | null = null,
    public is_active: boolean = true,
    public last_login_at: string | null = null,
    public created_at: string = '',
    public updated_at: string = '',
  ) {}

  static fromJson(json: any): UserModel {
    return new UserModel(
      json.id ?? '',
      json.roleId ?? json.role_id ?? '',
      json.role ?? null,
      json.portfolio_access_scope ?? 'assigned_brackets',
      Array.isArray(json.brackets) ? json.brackets : [],
      json.dni ?? null,
      json.full_name ?? '',
      json.email ?? '',
      json.phone ?? null,
      json.is_active ?? true,
      json.last_login_at ?? null,
      json.created_at ?? '',
      json.updated_at ?? '',
    );
  }

  toJson(): any {
    return {
      id: this.id,
      roleId: this.roleId,
      role: this.role,
      portfolio_access_scope: this.portfolio_access_scope,
      brackets: this.brackets,
      dni: this.dni,
      full_name: this.full_name,
      email: this.email,
      phone: this.phone,
      is_active: this.is_active,
      last_login_at: this.last_login_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

export interface UpsertUserPayload {
  roleId: string;
  full_name: string;
  email: string;
  password?: string;
  portfolio_access_scope?: 'all_clients' | 'assigned_brackets';
  bracketIds?: string[];
  dni?: string | null;
  phone?: string | null;
  is_active?: boolean;
}
