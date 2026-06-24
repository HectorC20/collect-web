import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import { BracketInterface, UpsertBracketPayloadInterface } from '../interfaces/bracket.interface';

interface BracketsResponse {
  data: BracketInterface[];
}

interface BracketResponse {
  data: BracketInterface;
}

@Injectable({
  providedIn: 'root'
})
export class BracketService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}collections/brackets`;

  getAll(search?: string): Observable<BracketInterface[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<BracketsResponse>(this.apiUrl, { params })
      .pipe(map((resp) => resp.data ?? []));
  }

  create(payload: UpsertBracketPayloadInterface): Observable<BracketInterface> {
    return this.http
      .post<BracketResponse>(this.apiUrl, payload)
      .pipe(map((resp) => resp.data));
  }

  update(id: string, payload: UpsertBracketPayloadInterface): Observable<BracketInterface> {
    return this.http
      .put<BracketResponse>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((resp) => resp.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
