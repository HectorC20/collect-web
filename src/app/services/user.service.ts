import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import { UserModel, UpsertUserPayload } from '../models/user.model';
import { RoleInterface } from '../interfaces/role.interface';

interface UsersResponse { data: UserModel[]; }
interface UserResponse { data: UserModel; }
interface RolesResponse { data: RoleInterface[]; }

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}auth/users`;

  getAll(search?: string): Observable<UserModel[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<UsersResponse>(this.apiUrl, { params })
      .pipe(map((r) => (r.data ?? []).map((item) => UserModel.fromJson(item))));
  }

  getRoles(): Observable<RoleInterface[]> {
    return this.http
      .get<RolesResponse>(`${KSOCKET}${KAPI}auth/users/roles/list`)
      .pipe(map((r) => r.data ?? []));
  }

  create(payload: UpsertUserPayload): Observable<UserModel> {
    return this.http
      .post<UserResponse>(this.apiUrl, payload)
      .pipe(map((r) => UserModel.fromJson(r.data)));
  }

  update(id: string, payload: UpsertUserPayload): Observable<UserModel> {
    return this.http
      .put<UserResponse>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((r) => UserModel.fromJson(r.data)));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
