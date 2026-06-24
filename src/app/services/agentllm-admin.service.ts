import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { KAPI, KSOCKET } from '../shared/constants';
import {
  AgentChannelOptionInterface,
  AgentCredentialInterface,
  AgentCredentialTestResultInterface,
  AgentFlowTestPayload,
  AgentFlowTestResponseInterface,
  AgentMcpDatasetOptionInterface,
  AgentMcpPreviewResponseInterface,
  AgentPlaygroundPayload,
  AgentPlaygroundResponseInterface,
  AgentMcpToolInterface,
  AgentProviderInterface,
  AgentRuntimeToolInterface,
  AgentSetupStatusInterface,
  AgentUserSettingInterface,
  UpsertAgentMcpToolPayload,
  UpsertAgentCredentialPayload,
  UpsertAgentProviderPayload,
  UpsertAgentUserSettingPayload,
} from '../interfaces/agentllm-admin.interface';

interface CollectionResponse<T> {
  data: T[];
}

interface ItemResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AgentLLMAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseApiUrl = `${KSOCKET}${KAPI}agentllm`;
  private readonly apiUrl = `${KSOCKET}${KAPI}agentllm/admin`;

  getAvailableProviders(): Observable<AgentProviderInterface[]> {
    return this.http
      .get<CollectionResponse<AgentProviderInterface>>(`${this.baseApiUrl}/providers`)
      .pipe(map((response) => response.data ?? []));
  }

  getChannels(): Observable<AgentChannelOptionInterface[]> {
    return this.http
      .get<CollectionResponse<AgentChannelOptionInterface>>(`${this.baseApiUrl}/channels`)
      .pipe(map((response) => response.data ?? []));
  }

  getMySetupStatus(): Observable<AgentSetupStatusInterface> {
    return this.http
      .get<ItemResponse<AgentSetupStatusInterface>>(`${this.baseApiUrl}/me/setup-status`)
      .pipe(map((response) => response.data));
  }

  getMyCredentials(): Observable<AgentCredentialInterface[]> {
    return this.http
      .get<CollectionResponse<AgentCredentialInterface>>(`${this.baseApiUrl}/me/credentials`)
      .pipe(map((response) => response.data ?? []));
  }

  createMyCredential(payload: UpsertAgentCredentialPayload): Observable<AgentCredentialInterface> {
    return this.http
      .post<ItemResponse<AgentCredentialInterface>>(`${this.baseApiUrl}/me/credentials`, payload)
      .pipe(map((response) => response.data));
  }

  updateMyCredential(id: string, payload: Partial<UpsertAgentCredentialPayload>): Observable<AgentCredentialInterface> {
    return this.http
      .put<ItemResponse<AgentCredentialInterface>>(`${this.baseApiUrl}/me/credentials/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deleteMyCredential(id: string): Observable<void> {
    return this.http.delete(`${this.baseApiUrl}/me/credentials/${id}`).pipe(map(() => void 0));
  }

  testMyCredential(id: string): Observable<AgentCredentialTestResultInterface> {
    return this.http
      .post<ItemResponse<AgentCredentialTestResultInterface>>(`${this.baseApiUrl}/me/credentials/${id}/test`, {})
      .pipe(map((response) => response.data));
  }

  getMySetting(): Observable<AgentUserSettingInterface> {
    return this.http
      .get<ItemResponse<AgentUserSettingInterface>>(`${this.baseApiUrl}/me/settings`)
      .pipe(map((response) => response.data));
  }

  updateMySetting(payload: UpsertAgentUserSettingPayload): Observable<AgentUserSettingInterface> {
    return this.http
      .put<ItemResponse<AgentUserSettingInterface>>(`${this.baseApiUrl}/me/settings`, payload)
      .pipe(map((response) => response.data));
  }

  getRuntimeTools(): Observable<AgentRuntimeToolInterface[]> {
    return this.http
      .get<CollectionResponse<AgentRuntimeToolInterface>>(`${this.baseApiUrl}/tools`)
      .pipe(map((response) => response.data ?? []));
  }

  playground(payload: AgentPlaygroundPayload): Observable<AgentPlaygroundResponseInterface> {
    return this.http
      .post<ItemResponse<AgentPlaygroundResponseInterface>>(`${this.baseApiUrl}/me/playground`, payload)
      .pipe(map((response) => response.data));
  }

  getProviders(): Observable<AgentProviderInterface[]> {
    return this.http
      .get<CollectionResponse<AgentProviderInterface>>(`${this.apiUrl}/providers`)
      .pipe(map((response) => response.data ?? []));
  }

  createProvider(payload: UpsertAgentProviderPayload): Observable<AgentProviderInterface> {
    return this.http
      .post<ItemResponse<AgentProviderInterface>>(`${this.apiUrl}/providers`, payload)
      .pipe(map((response) => response.data));
  }

  updateProvider(id: string, payload: Partial<UpsertAgentProviderPayload>): Observable<AgentProviderInterface> {
    return this.http
      .put<ItemResponse<AgentProviderInterface>>(`${this.apiUrl}/providers/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  getMcpDatasets(): Observable<AgentMcpDatasetOptionInterface[]> {
    return this.http
      .get<CollectionResponse<AgentMcpDatasetOptionInterface>>(`${this.apiUrl}/mcp-datasets`)
      .pipe(map((response) => response.data ?? []));
  }

  getMcpTools(): Observable<AgentMcpToolInterface[]> {
    return this.http
      .get<CollectionResponse<AgentMcpToolInterface>>(`${this.apiUrl}/mcp-tools`)
      .pipe(map((response) => response.data ?? []));
  }

  createMcpTool(payload: UpsertAgentMcpToolPayload): Observable<AgentMcpToolInterface> {
    return this.http
      .post<ItemResponse<AgentMcpToolInterface>>(`${this.apiUrl}/mcp-tools`, payload)
      .pipe(map((response) => response.data));
  }

  updateMcpTool(id: string, payload: UpsertAgentMcpToolPayload): Observable<AgentMcpToolInterface> {
    return this.http
      .put<ItemResponse<AgentMcpToolInterface>>(`${this.apiUrl}/mcp-tools/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deleteMcpTool(id: string): Observable<void> {
    return this.http.delete(`${this.apiUrl}/mcp-tools/${id}`).pipe(map(() => void 0));
  }

  previewMcpTool(id: string, argumentsPayload: Record<string, unknown>): Observable<AgentMcpPreviewResponseInterface> {
    return this.http
      .post<ItemResponse<AgentMcpPreviewResponseInterface>>(`${this.apiUrl}/mcp-tools/${id}/preview`, {
        arguments: argumentsPayload,
      })
      .pipe(map((response) => response.data));
  }

  getCredentials(): Observable<AgentCredentialInterface[]> {
    return this.http
      .get<CollectionResponse<AgentCredentialInterface>>(`${this.apiUrl}/credentials`)
      .pipe(map((response) => response.data ?? []));
  }

  createCredential(payload: UpsertAgentCredentialPayload): Observable<AgentCredentialInterface> {
    return this.http
      .post<ItemResponse<AgentCredentialInterface>>(`${this.apiUrl}/credentials`, payload)
      .pipe(map((response) => response.data));
  }

  updateCredential(id: string, payload: Partial<UpsertAgentCredentialPayload>): Observable<AgentCredentialInterface> {
    return this.http
      .put<ItemResponse<AgentCredentialInterface>>(`${this.apiUrl}/credentials/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deleteCredential(id: string): Observable<void> {
    return this.http.delete(`${this.apiUrl}/credentials/${id}`).pipe(map(() => void 0));
  }

  testCredential(id: string): Observable<AgentCredentialInterface> {
    return this.http
      .post<ItemResponse<{ credential: AgentCredentialInterface }>>(`${this.apiUrl}/credentials/${id}/test`, {})
      .pipe(map((response) => response.data.credential));
  }

  getSettings(): Observable<AgentUserSettingInterface[]> {
    return this.http
      .get<CollectionResponse<AgentUserSettingInterface>>(`${this.apiUrl}/settings`)
      .pipe(map((response) => response.data ?? []));
  }

  updateSetting(userId: string, payload: UpsertAgentUserSettingPayload): Observable<AgentUserSettingInterface> {
    return this.http
      .put<ItemResponse<AgentUserSettingInterface>>(`${this.apiUrl}/settings/${userId}`, payload)
      .pipe(map((response) => response.data));
  }

  testFlow(payload: AgentFlowTestPayload): Observable<AgentFlowTestResponseInterface> {
    return this.http
      .post<ItemResponse<AgentFlowTestResponseInterface>>(`${this.apiUrl}/flow/test`, payload)
      .pipe(map((response) => response.data));
  }
}
