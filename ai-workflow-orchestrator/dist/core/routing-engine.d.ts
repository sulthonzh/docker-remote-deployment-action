import { Workflow, WorkflowStep, WorkflowState, ExecutionResult, RoutingDecision } from '../types';
import { ConditionEvaluator } from '../utils/condition-evaluator';
export declare class RoutingEngine {
    private conditionEvaluator;
    constructor(conditionEvaluator: ConditionEvaluator);
    decideNextStep(workflow: Workflow, currentStep: WorkflowStep, state: WorkflowState, result: ExecutionResult): Promise<RoutingDecision>;
    private handleSequentialNextSteps;
    private handleDependencyBasedRouting;
    private handleConditionalRouting;
    private handleDefaultRouting;
    private checkDependencies;
    private findNextStepInWorkflow;
    evaluateDynamicRouting(workflow: Workflow, currentStep: WorkflowStep, state: WorkflowState, result: ExecutionResult): Promise<RoutingDecision>;
}
//# sourceMappingURL=routing-engine.d.ts.map