import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import { SystemParameterInterface, UpsertSystemParameterPayloadInterface } from '../interfaces/system-parameter.interface';

interface ParametersResponse {
  data: SystemParameterInterface[];
}

interface ParameterResponse {
  data: SystemParameterInterface;
}

@Injectable({
  providedIn: 'root'
})
export class SystemParameterService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}system/parameters`;

  getAll(search?: string): Observable<SystemParameterInterface[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<ParametersResponse>(this.apiUrl, { params })
      .pipe(map((resp) => resp.data ?? []));
  }

  create(payload: UpsertSystemParameterPayloadInterface): Observable<SystemParameterInterface> {
    return this.http
      .post<ParameterResponse>(this.apiUrl, payload)
      .pipe(map((resp) => resp.data));
  }

  update(id: string, payload: UpsertSystemParameterPayloadInterface): Observable<SystemParameterInterface> {
    return this.http
      .put<ParameterResponse>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((resp) => resp.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
