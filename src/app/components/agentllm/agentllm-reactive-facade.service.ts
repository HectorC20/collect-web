import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  AgentChannelOptionInterface,
  AgentCredentialInterface,
  AgentCredentialTestResultInterface,
  AgentMcpDatasetOptionInterface,
  AgentMcpPreviewResponseInterface,
  AgentMcpToolInterface,
  AgentPlaygroundPayload,
  AgentPlaygroundResponseInterface,
  AgentProviderInterface,
  AgentRuntimeToolInterface,
  AgentSetupStatusInterface,
  AgentUserSettingInterface,
  UpsertAgentCredentialPayload,
  UpsertAgentMcpToolPayload,
  UpsertAgentUserSettingPayload,
} from '@/app/interfaces/agentllm-admin.interface';
import { AgentLLMAdminService } from '@/app/services/agentllm-admin.service';
import { WhatsappService } from '@/app/services/whatsapp.service';
import { WhatsappSessionView } from '@/app/interfaces/whatsappconversation.interface';
import { extractErrorMessage } from '@/app/shared/utils/whatsapp.utils';

@Injectable()
export class AgentLlmReactiveFacadeService {
  private readonly agentService = inject(AgentLLMAdminService);
  private readonly whatsappService = inject(WhatsappService);

  readonly loading = signal(true);
  readonly savingCredential = signal(false);
  readonly savingAccess = signal(false);
  readonly savingMcpTool = signal(false);
  readonly previewingMcpToolId = signal<string | null>(null);
  readonly testingCredentialId = signal<string | null>(null);
  readonly deletingMcpToolId = signal<string | null>(null);
  readonly deletingCredentialId = signal<string | null>(null);
  readonly runningPlayground = signal(false);

  readonly providers = signal<AgentProviderInterface[]>([]);
  readonly channels = signal<AgentChannelOptionInterface[]>([]);
  readonly mcpDatasets = signal<AgentMcpDatasetOptionInterface[]>([]);
  readonly mcpTools = signal<AgentMcpToolInterface[]>([]);
  readonly credentials = signal<AgentCredentialInterface[]>([]);
  readonly whatsappSessions = signal<WhatsappSessionView[]>([]);
  readonly runtimeTools = signal<AgentRuntimeToolInterface[]>([]);
  readonly setupStatus = signal<AgentSetupStatusInterface | null>(null);
  readonly setting = signal<AgentUserSettingInterface | null>(null);

  readonly feedback = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly credentialTestResult = signal<AgentCredentialTestResultInterface | null>(null);
  readonly playgroundError = signal<string | null>(null);
  readonly mcpPreview = signal<AgentMcpPreviewResponseInterface | null>(null);
  readonly playgroundResult = signal<AgentPlaygroundResponseInterface | null>(null);

  readonly activeCredentials = computed(() => this.credentials().filter((credential) => credential.is_active));

  async loadData(): Promise<void> {
    this.loading.set(true);

    try {
      const {
        setupStatus,
        providers,
        channels,
        credentials,
        setting,
        mcpDatasets,
        mcpTools,
        runtimeTools,
        whatsappSessions,
      } = await firstValueFrom(
        forkJoin({
          setupStatus: this.agentService.getMySetupStatus(),
          providers: this.agentService.getAvailableProviders(),
          channels: this.agentService.getChannels(),
          credentials: this.agentService.getMyCredentials(),
          setting: this.agentService.getMySetting(),
          mcpDatasets: this.agentService.getMcpDatasets(),
          mcpTools: this.agentService.getMcpTools(),
          runtimeTools: this.agentService.getRuntimeTools(),
          whatsappSessions: this.whatsappService.getSessions(),
        })
      );

      this.setupStatus.set(setupStatus);
      this.providers.set(providers);
      this.channels.set(channels);
      this.credentials.set(credentials);
      this.setting.set(setting);
      this.mcpDatasets.set(mcpDatasets);
      this.mcpTools.set(mcpTools);
      this.runtimeTools.set(runtimeTools);
      this.whatsappSessions.set(whatsappSessions);
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo cargar la configuracion guiada de AgentLLM.'));
    } finally {
      this.loading.set(false);
    }
  }

  async saveCredential(selectedCredentialId: string | null, payload: UpsertAgentCredentialPayload): Promise<boolean> {
    this.savingCredential.set(true);
    this.clearMessages();

    try {
      await firstValueFrom(
        selectedCredentialId
          ? this.agentService.updateMyCredential(selectedCredentialId, payload)
          : this.agentService.createMyCredential(payload)
      );

      this.feedback.set(
        selectedCredentialId ? 'API key actualizada correctamente.' : 'API key registrada correctamente.'
      );

      await this.loadData();

      return true;
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo guardar la API key.'));
      return false;
    } finally {
      this.savingCredential.set(false);
    }
  }

  async deleteCredential(id: string): Promise<boolean> {
    this.deletingCredentialId.set(id);

    try {
      await firstValueFrom(this.agentService.deleteMyCredential(id));
      this.feedback.set('API key eliminada correctamente.');
      await this.loadData();
      return true;
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo eliminar la API key.'));
      return false;
    } finally {
      this.deletingCredentialId.set(null);
    }
  }

  async testCredential(credential: AgentCredentialInterface): Promise<void> {
    this.testingCredentialId.set(credential.id);
    this.clearMessages();

    try {
      const result = await firstValueFrom(this.agentService.testMyCredential(credential.id));
      this.credentialTestResult.set(result);
      this.credentials.update((items) => items.map((item) => item.id === result.credential.id ? result.credential : item));
      this.feedback.set(
        result.result?.message
          ? String(result.result.message)
          : `La prueba de "${credential.alias || credential.provider_name}" fue exitosa.`
      );
      await this.refreshSetupStatus();
    } catch (err) {
      this.credentialTestResult.set(null);
      this.error.set(extractErrorMessage(err, 'La prueba de conexion falló.'));
      await this.refreshCredentialsAndSetup();
    } finally {
      this.testingCredentialId.set(null);
    }
  }

  async saveAgentSetting(payload: UpsertAgentUserSettingPayload): Promise<boolean> {
    this.savingAccess.set(true);
    this.clearMessages();

    try {
      const setting = await firstValueFrom(this.agentService.updateMySetting(payload));
      this.setting.set(setting);
      this.feedback.set('Configuracion del agente actualizada correctamente.');
      await this.refreshSetupStatus();
      return true;
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo actualizar la configuracion del agente.'));
      return false;
    } finally {
      this.savingAccess.set(false);
    }
  }

  async runPlayground(payload: AgentPlaygroundPayload): Promise<void> {
    this.runningPlayground.set(true);
    this.playgroundError.set(null);
    this.playgroundResult.set(null);

    try {
      const result = await firstValueFrom(this.agentService.playground(payload));
      this.playgroundResult.set(result);
    } catch (err) {
      this.playgroundError.set(extractErrorMessage(err, 'No se pudo ejecutar el playground.'));
    } finally {
      this.runningPlayground.set(false);
    }
  }

  async saveMcpTool(selectedMcpToolId: string | null, payload: UpsertAgentMcpToolPayload): Promise<boolean> {
    this.savingMcpTool.set(true);
    this.clearMessages();

    try {
      await firstValueFrom(
        selectedMcpToolId
          ? this.agentService.updateMcpTool(selectedMcpToolId, payload)
          : this.agentService.createMcpTool(payload)
      );

      this.feedback.set(
        selectedMcpToolId ? 'Herramienta MCP actualizada correctamente.' : 'Herramienta MCP creada correctamente.'
      );

      await this.loadData();

      return true;
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo guardar la herramienta MCP.'));
      return false;
    } finally {
      this.savingMcpTool.set(false);
    }
  }

  async deleteMcpTool(id: string): Promise<boolean> {
    this.deletingMcpToolId.set(id);

    try {
      await firstValueFrom(this.agentService.deleteMcpTool(id));
      this.feedback.set('Herramienta MCP eliminada correctamente.');
      await this.loadData();
      return true;
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo eliminar la herramienta MCP.'));
      return false;
    } finally {
      this.deletingMcpToolId.set(null);
    }
  }

  async runMcpPreview(toolId: string, args: Record<string, unknown>): Promise<void> {
    this.previewingMcpToolId.set(toolId);

    try {
      const result = await firstValueFrom(this.agentService.previewMcpTool(toolId, args));
      this.mcpPreview.set(result);
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'No se pudo ejecutar la vista previa de la MCP.'));
    } finally {
      this.previewingMcpToolId.set(null);
    }
  }

  clearMessages(): void {
    this.feedback.set(null);
    this.error.set(null);
  }

  clearCredentialTestResult(): void {
    this.credentialTestResult.set(null);
  }

  clearPreviewResult(): void {
    this.mcpPreview.set(null);
  }

  private async refreshSetupStatus(): Promise<void> {
    try {
      const setupStatus = await firstValueFrom(this.agentService.getMySetupStatus());
      this.setupStatus.set(setupStatus);
    } catch {
      // Keep previous state if lightweight refresh fails.
    }
  }

  private async refreshCredentialsAndSetup(): Promise<void> {
    try {
      const [credentials, setupStatus] = await Promise.all([
        firstValueFrom(this.agentService.getMyCredentials()),
        firstValueFrom(this.agentService.getMySetupStatus()),
      ]);

      this.credentials.set(credentials);
      this.setupStatus.set(setupStatus);
    } catch {
      // Keep previous state if lightweight refresh fails.
    }
  }
}
