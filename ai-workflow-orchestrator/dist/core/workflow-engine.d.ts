import { EventEmitter } from 'events';
import { Workflow, WorkflowState } from '../types';
import { StateManager } from './state-manager';
import { AgentExecutor } from './agent-executor';
import { Logger } from '../utils/logger';
export declare class WorkflowEngine extends EventEmitter {
    private agentExecutor;
    private stateManager;
    private logger;
    private conditionEvaluator;
    private routingEngine;
    constructor(agentExecutor: AgentExecutor, stateManager: StateManager, logger: Logger);
    execute(workflow: Workflow, inputData?: Record<string, any>): Promise<WorkflowState>;
    continueExecution(workflow: Workflow, executionId: string): Promise<WorkflowState>;
    private executeStep;
    private executeAgentStep;
    private executeConditionStep;
    private executeParallelStep;
    private executeSequenceStep;
    private executeWaitStep;
    private executeCustomStep;
    private executeSubStep;
    private handleNextSteps;
    private skipToNextStep;
    private retryStep;
    private findNextStep;
    private generateExecutionId;
}
//# sourceMappingURL=workflow-engine.d.ts.map