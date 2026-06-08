import { EventEmitter } from 'events';
import { Workflow, WorkflowState, WorkflowOrchestratorConfig } from '../types';
import { StateManager } from './state-manager';
export declare class WorkflowOrchestrator extends EventEmitter {
    private config;
    stateManager: StateManager;
    private agentExecutor;
    private workflowEngine;
    private logger;
    private isRunning;
    constructor(config: any);
    static create(storageConfig: {
        type: 'memory' | 'file' | 'database';
        config?: any;
    }): WorkflowOrchestrator;
    private setupEventHandlers;
    start(): Promise<void>;
    stop(): Promise<void>;
    executeWorkflow(workflowId: string, inputData?: Record<string, any>): Promise<WorkflowState>;
    pauseWorkflow(workflowId: string, executionId: string): Promise<void>;
    resumeWorkflow(workflowId: string, executionId: string): Promise<WorkflowState>;
    stopWorkflow(workflowId: string, executionId: string): Promise<void>;
    getWorkflowStatus(executionId: string): Promise<WorkflowState | null>;
    listWorkflows(): Promise<Workflow[]>;
    getWorkflow(workflowId: string): Promise<Workflow | null>;
    addWorkflow(workflow: Workflow): Promise<void>;
    updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<void>;
    removeWorkflow(workflowId: string): Promise<void>;
    getMetrics(workflowId?: string): Promise<any[]>;
    getStats(): Promise<{
        totalExecutions: number;
        activeExecutions: number;
        completedExecutions: number;
        failedExecutions: number;
        averageDuration: number;
    }>;
    isRunningStatus(): boolean;
}
export type { WorkflowOrchestratorConfig };
//# sourceMappingURL=orchestrator.d.ts.map