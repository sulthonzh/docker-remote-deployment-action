"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const events_1 = require("events");
const condition_evaluator_1 = require("../utils/condition-evaluator");
const routing_engine_1 = require("./routing-engine");
class WorkflowEngine extends events_1.EventEmitter {
    agentExecutor;
    stateManager;
    logger;
    conditionEvaluator;
    routingEngine;
    constructor(agentExecutor, stateManager, logger) {
        super();
        this.agentExecutor = agentExecutor;
        this.stateManager = stateManager;
        this.logger = logger;
        this.conditionEvaluator = new condition_evaluator_1.ConditionEvaluator();
        this.routingEngine = new routing_engine_1.RoutingEngine(this.conditionEvaluator);
    }
    async execute(workflow, inputData) {
        const executionId = this.generateExecutionId();
        const startTime = new Date();
        const initialState = {
            workflowId: workflow.id,
            currentStep: workflow.entryPoint,
            status: 'running',
            data: inputData || {},
            variables: {},
            history: [],
            startTime,
            createdAt: new Date()
        };
        await this.stateManager.saveWorkflowState(executionId, initialState);
        this.emit('workflowStarted', { workflowId: workflow.id, executionId });
        return await this.executeStep(executionId, workflow, initialState);
    }
    async continueExecution(workflow, executionId) {
        const currentState = await this.stateManager.getWorkflowState(executionId);
        if (!currentState) {
            throw new Error(`Workflow state not found for execution ID: ${executionId}`);
        }
        return await this.executeStep(executionId, workflow, currentState);
    }
    async executeStep(executionId, workflow, state) {
        try {
            const step = workflow.steps[state.currentStep];
            if (!step) {
                throw new Error(`Step not found: ${state.currentStep}`);
            }
            this.logger.info(`Executing step: ${step.name} (${step.id})`);
            this.emit('stepStarted', { executionId, stepId: step.id, stepName: step.name });
            const executionStep = {
                stepId: step.id,
                stepName: step.name,
                status: 'running',
                startTime: new Date(),
                retryCount: 0
            };
            // Ensure startTime is not undefined for duration calculation
            const startTime = executionStep.startTime || new Date();
            state.history.push(executionStep);
            await this.stateManager.saveWorkflowState(executionId, state);
            // Handle different step types
            let result;
            switch (step.type) {
                case 'agent':
                    result = await this.executeAgentStep(step, state);
                    break;
                case 'condition':
                    result = await this.executeConditionStep(step, state);
                    break;
                case 'parallel':
                    result = await this.executeParallelStep(step, state);
                    break;
                case 'sequence':
                    result = await this.executeSequenceStep(step, state);
                    break;
                case 'wait':
                    result = await this.executeWaitStep(step, state);
                    break;
                case 'custom':
                    result = await this.executeCustomStep(step, state);
                    break;
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }
            executionStep.status = result.success ? 'completed' : 'failed';
            executionStep.endTime = new Date();
            executionStep.duration = executionStep.endTime.getTime() - (startTime || executionStep.startTime).getTime();
            executionStep.result = result.data;
            if (!result.success) {
                executionStep.error = result.error;
            }
            // Update state with result
            if (result.success && result.data) {
                state.data = { ...state.data, ...result.data };
            }
            state.history[state.history.length - 1] = executionStep;
            await this.stateManager.saveWorkflowState(executionId, state);
            this.emit('stepCompleted', { executionId, stepId: step.id, stepName: step.name, result });
            // Determine next steps
            const routingDecision = await this.routingEngine.decideNextStep(workflow, step, state, result);
            if (routingDecision.result === 'continue') {
                if (routingDecision.nextSteps && routingDecision.nextSteps.length > 0) {
                    // Handle next steps
                    return await this.handleNextSteps(executionId, workflow, state, routingDecision.nextSteps);
                }
                else {
                    // Workflow completed
                    state.status = 'completed';
                    state.endTime = new Date();
                    await this.stateManager.saveWorkflowState(executionId, state);
                    this.emit('workflowCompleted', { executionId, workflowId: workflow.id });
                    return state;
                }
            }
            else if (routingDecision.result === 'skip') {
                return await this.skipToNextStep(executionId, workflow, state);
            }
            else if (routingDecision.result === 'retry') {
                return await this.retryStep(executionId, workflow, state, step);
            }
            else if (routingDecision.result === 'abort') {
                state.status = 'failed';
                state.endTime = new Date();
                state.error = routingDecision.reason;
                await this.stateManager.saveWorkflowState(executionId, state);
                this.emit('workflowFailed', { executionId, workflowId: workflow.id, error: routingDecision.reason });
                return state;
            }
            return state;
        }
        catch (error) {
            this.logger.error(`Error executing step ${state.currentStep}:`, error);
            state.status = 'failed';
            state.endTime = new Date();
            state.error = error instanceof Error ? error.message : 'Unknown error';
            const lastStep = state.history[state.history.length - 1];
            if (lastStep) {
                lastStep.status = 'failed';
                lastStep.endTime = new Date();
                lastStep.error = state.error;
            }
            await this.stateManager.saveWorkflowState(executionId, state);
            this.emit('workflowFailed', { executionId, workflowId: workflow.id, error: state.error });
            return state;
        }
    }
    async executeAgentStep(step, state) {
        if (!step.agent) {
            throw new Error('Agent step requires agent configuration');
        }
        const agentResult = await this.agentExecutor.executeAgent(step.agent, {
            ...step.parameters,
            context: state.data,
            variables: state.variables
        });
        return {
            success: agentResult.success,
            data: agentResult.data,
            error: agentResult.error,
            duration: agentResult.duration,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeConditionStep(step, state) {
        if (!step.condition) {
            throw new Error('Condition step requires condition expression');
        }
        const result = await this.conditionEvaluator.evaluate(step.condition, {
            ...state.data,
            variables: state.variables
        });
        return {
            success: true,
            data: { result },
            error: undefined,
            duration: 0,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeParallelStep(step, state) {
        if (!step.steps || step.steps.length === 0) {
            throw new Error('Parallel step requires sub-steps');
        }
        const promises = step.steps.map(subStep => this.executeSubStep(subStep, state));
        const results = await Promise.allSettled(promises);
        const failedResults = results.filter(r => r.status === 'rejected');
        const successfulResults = results.filter(r => r.status === 'fulfilled');
        if (failedResults.length > 0) {
            return {
                success: false,
                data: { results: successfulResults.map(r => r.value) },
                error: `Some parallel steps failed: ${failedResults.length} failed`,
                duration: 0,
                stepId: step.id,
                stepName: step.name,
                retryCount: 0
            };
        }
        return {
            success: true,
            data: { results: successfulResults.map(r => r.value) },
            error: undefined,
            duration: 0,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeSequenceStep(step, state) {
        if (!step.steps || step.steps.length === 0) {
            throw new Error('Sequence step requires sub-steps');
        }
        let sequenceResult = {};
        for (const subStep of step.steps) {
            const result = await this.executeSubStep(subStep, state);
            if (!result.success) {
                return result;
            }
            sequenceResult[subStep.id] = result.data;
        }
        return {
            success: true,
            data: sequenceResult,
            error: undefined,
            duration: 0,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeWaitStep(step, state) {
        const waitTime = step.parameters?.duration || 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return {
            success: true,
            data: { waited: waitTime },
            error: undefined,
            duration: waitTime,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeCustomStep(step, state) {
        // Custom step execution would be handled by plugins or extensions
        // For now, just return success with the step parameters
        return {
            success: true,
            data: step.parameters || {},
            error: undefined,
            duration: 0,
            stepId: step.id,
            stepName: step.name,
            retryCount: 0
        };
    }
    async executeSubStep(step, state) {
        // This is a simplified version - in practice, you'd need proper state management
        return await this.executeAgentStep(step, state);
    }
    async handleNextSteps(executionId, workflow, state, nextSteps) {
        if (nextSteps.length === 1) {
            state.currentStep = nextSteps[0];
            return await this.executeStep(executionId, workflow, state);
        }
        else {
            // Handle multiple next steps - could be parallel execution
            state.currentStep = nextSteps[0];
            return await this.executeStep(executionId, workflow, state);
        }
    }
    async skipToNextStep(executionId, workflow, state) {
        // Find the next step based on workflow flow
        const nextStep = this.findNextStep(workflow, state.currentStep);
        if (nextStep) {
            state.currentStep = nextStep;
            return await this.executeStep(executionId, workflow, state);
        }
        else {
            state.status = 'completed';
            state.endTime = new Date();
            await this.stateManager.saveWorkflowState(executionId, state);
            this.emit('workflowCompleted', { executionId, workflowId: workflow.id });
            return state;
        }
    }
    async retryStep(executionId, workflow, state, step) {
        const retryDelay = step.retryDelay || 1000;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await this.executeStep(executionId, workflow, state);
    }
    findNextStep(workflow, currentStepId) {
        // Find the next step in the workflow
        // This is a simplified implementation - in practice, you'd need proper workflow graph traversal
        const stepIds = Object.keys(workflow.steps);
        const currentIndex = stepIds.indexOf(currentStepId);
        if (currentIndex !== -1 && currentIndex < stepIds.length - 1) {
            return stepIds[currentIndex + 1];
        }
        return null;
    }
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.WorkflowEngine = WorkflowEngine;
//# sourceMappingURL=workflow-engine.js.map