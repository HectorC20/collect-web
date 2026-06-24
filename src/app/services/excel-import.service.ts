import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import {
  ExcelExportResultInterface,
  ExcelImportInterface,
  ExcelImportResultInterface,
  ExcelImportType,
  ExcelProcessOperation,
} from '../interfaces/excel-import.interface';

interface ImportsResponse {
  data: ExcelImportInterface[];
}

interface UploadResponse {
  data: ExcelImportResultInterface;
}

interface PreviewResponse {
  data: any;
}

@Injectable({ providedIn: 'root' })
export class ExcelImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${KSOCKET}${KAPI}imports`;

  getAll(type?: ExcelImportType, operation?: ExcelProcessOperation): Observable<ExcelImportInterface[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    if (operation) {
      params = params.set('operation', operation);
    }

    return this.http
      .get<ImportsResponse>(this.apiUrl, { params })
      .pipe(map((resp) => resp.data ?? []));
  }

  preview(file: File, type: ExcelImportType, assignedUserId?: string | null, bracketMapping?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    if (assignedUserId) {
      formData.append('assignedUserId', assignedUserId);
    }
    
    if (bracketMapping) {
      formData.append('bracketMapping', bracketMapping);
    }

    return this.http
      .post<PreviewResponse>(`${this.apiUrl}/preview`, formData)
      .pipe(map((resp) => resp.data));
  }

  upload(file: File, type: ExcelImportType, assignedUserId?: string | null, bracketMapping?: string): Observable<ExcelImportResultInterface> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    if (assignedUserId) {
      formData.append('assignedUserId', assignedUserId);
    }
    
    if (bracketMapping) {
      formData.append('bracketMapping', bracketMapping);
    }

    return this.http
      .post<UploadResponse>(`${this.apiUrl}/upload`, formData)
      .pipe(map((resp) => resp.data));
  }

  export(type: ExcelImportType): Observable<ExcelExportResultInterface> {
    return this.http
      .post(`${this.apiUrl}/export`, { type }, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response: HttpResponse<Blob>) => ({
        blob: response.body ?? new Blob(),
        fileName: this.extractFileName(response) ?? `${type}-report.csv`,
        totalRecords: Number(response.headers.get('X-Export-Total-Records') ?? '0'),
      })));
  }

  private extractFileName(response: HttpResponse<Blob>): string | null {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (!contentDisposition) {
      return response.headers.get('X-Export-File-Name');
    }

    const match = contentDisposition.match(/filename="?([^"]+)"?/i);
    return match?.[1] ?? response.headers.get('X-Export-File-Name');
  }
}
