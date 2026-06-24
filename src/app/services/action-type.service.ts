import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import { ActionTypeInterface, UpsertActionTypePayloadInterface } from '../interfaces/action-type.interface';

interface ActionTypesResponse {
  data: ActionTypeInterface[];
}

interface ActionTypeResponse {
  data: ActionTypeInterface;
}

@Injectable({
  providedIn: 'root'
})
export class ActionTypeService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}collections/action-types`;

  getAll(search?: string): Observable<ActionTypeInterface[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<ActionTypesResponse>(this.apiUrl, { params })
      .pipe(map((resp) => resp.data ?? []));
  }

  create(payload: UpsertActionTypePayloadInterface): Observable<ActionTypeInterface> {
    return this.http
      .post<ActionTypeResponse>(this.apiUrl, payload)
      .pipe(map((resp) => resp.data));
  }

  update(id: string, payload: UpsertActionTypePayloadInterface): Observable<ActionTypeInterface> {
    return this.http
      .put<ActionTypeResponse>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((resp) => resp.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
