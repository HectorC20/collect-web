import { Injectable } from '@angular/core';
import {
  AgentLlmFlowConnectionState,
  AgentLlmFlowPhase,
  AgentLlmModalKey,
  AgentLlmModalMode,
  AgentLlmOperationKey,
  AgentLlmOperationState,
  AgentLlmPreviewMode,
  AgentLlmViewMachine,
  AgentLlmViewState,
} from '@/app/interfaces/agentllm-state.interface';
import { AGENT_LLM_INITIAL_STATE } from '@/app/shared/dictionary/agentllm-state.dictionary';

@Injectable({ providedIn: 'root' })
export class AgentLlmStateService {
  readonly state: AgentLlmViewMachine = this.createInitialState();

  reset(): void {
    Object.assign(this.state, this.createInitialState());
  }

  setPageState(page: AgentLlmViewState): void {
    this.state.page = page;
  }

  setModalState(modal: AgentLlmModalKey, mode: AgentLlmModalMode): void {
    this.state.modals[modal] = mode;
  }

  setPreviewModalState(mode: AgentLlmPreviewMode): void {
    this.state.modals.mcpPreview = mode;
  }

  setOperationState(operation: AgentLlmOperationKey, nextState: AgentLlmOperationState): void {
    this.state.operations[operation] = nextState;
  }

  setFlowPhase(phase: AgentLlmFlowPhase): void {
    this.state.flow.phase = phase;
  }

  setFlowConnection(connection: AgentLlmFlowConnectionState): void {
    this.state.flow.connection = connection;
  }

  startFlowRun(runId: string): void {
    this.state.flow.runId = runId;
    this.state.flow.phase = 'connecting';
  }

  completeFlowRun(): void {
    this.state.flow.phase = 'completed';
  }

  failFlowRun(): void {
    this.state.flow.phase = 'failed';
  }

  clearFlowRun(): void {
    this.state.flow.runId = null;
    this.state.flow.phase = 'idle';
  }

  isOperationPending(operation: AgentLlmOperationKey): boolean {
    return this.state.operations[operation] === 'pending';
  }

  private createInitialState(): AgentLlmViewMachine {
    return {
      page: AGENT_LLM_INITIAL_STATE.page,
      modals: { ...AGENT_LLM_INITIAL_STATE.modals },
      operations: { ...AGENT_LLM_INITIAL_STATE.operations },
      flow: { ...AGENT_LLM_INITIAL_STATE.flow },
    };
  }
}
