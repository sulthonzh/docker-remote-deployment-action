export interface WorkflowStep {
    id: string;
    name: string;
    type: 'agent' | 'condition' | 'parallel' | 'sequence' | 'wait' | 'custom';
    agent?: AgentConfig;
    condition?: string;
    steps?: WorkflowStep[];
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    parameters?: Record<string, any>;
    dependencies?: string[];
}
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    version: string;
    entryPoint: string;
    steps: Record<string, WorkflowStep>;
    globalTimeout?: number;
    maxRetries?: number;
    state: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
export interface AgentConfig {
    id: string;
    name: string;
    type: 'openai' | 'claude' | 'local' | 'custom';
    endpoint?: string;
    model: string;
    parameters: Record<string, any>;
    capabilities: string[];
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    enabled: boolean;
}
export interface WorkflowState {
    workflowId: string;
    currentStep: string;
    status: 'running' | 'completed' | 'failed' | 'paused' | 'waiting';
    data: Record<string, any>;
    variables: Record<string, any>;
    history: WorkflowExecutionStep[];
    startTime?: Date;
    endTime?: Date;
    error?: string;
    createdAt: Date;
}
export interface WorkflowExecutionStep {
    stepId: string;
    stepName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    result?: any;
    error?: string;
    retryCount: number;
    duration?: number;
}
export interface ExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    stepId: string;
    stepName: string;
    retryCount: number;
}
export interface WorkflowOrchestratorConfig {
    workflows: Workflow[];
    agents: AgentConfig[];
    storage: {
        type: 'memory' | 'file' | 'database';
        config?: any;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        file?: string;
    };
    metrics: {
        enabled: boolean;
        retentionDays: number;
    };
}
export interface RoutingDecision {
    stepId: string;
    condition?: string;
    result: 'continue' | 'skip' | 'retry' | 'abort';
    nextSteps?: string[];
    reason: string;
}
export interface MetricsData {
    workflowId: string;
    executionId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    stepsCompleted: number;
    stepsFailed: number;
    totalRetries: number;
    success: boolean;
    errors: string[];
}
//# sourceMappingURL=index.d.ts.map