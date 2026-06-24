import { UserModel } from './user.model';

export class AuthResponseModel {
  constructor(
    public token: string = '',
    public user: UserModel | null = null,
    public message: string | null = null,
    public success: boolean = true
  ) {}

  static fromJson(json: any): AuthResponseModel {
    return new AuthResponseModel(
      json.token || '',
      json.user ? UserModel.fromJson(json.user) : null,
      json.message ?? null,
      true
    );
  }

  static unauthorized(message: string = 'Credenciales inválidas.'): AuthResponseModel {
    return new AuthResponseModel('', null, message, false);
  }

  hasSession(): boolean {
    return !!this.token && !!this.user;
  }

  toJson(): any {
    return {
      token: this.token,
      user: this.user ? this.user.toJson() : null,
      message: this.message,
      success: this.success
    };
  }
}
