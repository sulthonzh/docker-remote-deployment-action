import { WorkflowState, WorkflowOrchestratorConfig, MetricsData } from '../types';
export declare class StateManager {
    private config;
    private stateDir;
    private metricsDir;
    private initialized;
    constructor(config: WorkflowOrchestratorConfig);
    initialize(): Promise<void>;
    saveWorkflowState(executionId: string, state: WorkflowState): Promise<void>;
    getWorkflowState(executionId: string): Promise<WorkflowState | null>;
    listWorkflowStates(workflowId?: string): Promise<WorkflowState[]>;
    deleteWorkflowState(executionId: string): Promise<boolean>;
    cleanupOldStates(): Promise<void>;
    pauseWorkflow(executionId: string): Promise<void>;
    resumeWorkflow(executionId: string): Promise<void>;
    stopWorkflow(executionId: string): Promise<void>;
    saveMetrics(metrics: MetricsData): Promise<void>;
    getMetrics(workflowId?: string): Promise<MetricsData[]>;
    cleanupOldMetrics(): Promise<void>;
    getStats(): Promise<{
        totalExecutions: number;
        activeExecutions: number;
        completedExecutions: number;
        failedExecutions: number;
        averageDuration: number;
    }>;
    cleanup(): Promise<void>;
    private getStateFilePath;
    private getMetricsFilePath;
}
//# sourceMappingURL=state-manager.d.ts.map