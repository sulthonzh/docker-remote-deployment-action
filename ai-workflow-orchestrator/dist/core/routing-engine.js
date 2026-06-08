"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingEngine = void 0;
class RoutingEngine {
    conditionEvaluator;
    constructor(conditionEvaluator) {
        this.conditionEvaluator = conditionEvaluator;
    }
    async decideNextStep(workflow, currentStep, state, result) {
        // Check if step has explicit next steps defined
        if (currentStep.steps && currentStep.steps.length > 0) {
            return await this.handleSequentialNextSteps(workflow, currentStep, state, result);
        }
        // Check for dependencies
        if (currentStep.dependencies && currentStep.dependencies.length > 0) {
            return await this.handleDependencyBasedRouting(workflow, currentStep, state, result);
        }
        // Check for conditions
        if (currentStep.condition) {
            return await this.handleConditionalRouting(workflow, currentStep, state, result);
        }
        // Default: continue to next step in workflow
        return await this.handleDefaultRouting(workflow, currentStep, state, result);
    }
    async handleSequentialNextSteps(workflow, currentStep, state, result) {
        if (!currentStep.steps) {
            return {
                stepId: currentStep.id,
                result: 'continue',
                nextSteps: [],
                reason: 'No sub-steps defined'
            };
        }
        const nextSteps = [];
        for (const subStep of currentStep.steps) {
            // Check dependencies for each sub-step
            if (subStep.dependencies) {
                const dependenciesMet = await this.checkDependencies(subStep.dependencies, state);
                if (dependenciesMet) {
                    nextSteps.push(subStep.id);
                }
            }
            else {
                nextSteps.push(subStep.id);
            }
        }
        if (nextSteps.length === 0) {
            return {
                stepId: currentStep.id,
                result: 'skip',
                reason: 'No sub-steps have their dependencies met'
            };
        }
        return {
            stepId: currentStep.id,
            result: 'continue',
            nextSteps,
            reason: `Executing ${nextSteps.length} sub-steps`
        };
    }
    async handleDependencyBasedRouting(workflow, currentStep, state, result) {
        const dependenciesMet = await this.checkDependencies(currentStep.dependencies, state);
        if (!dependenciesMet) {
            return {
                stepId: currentStep.id,
                result: 'continue',
                reason: 'Dependencies not yet satisfied, waiting'
            };
        }
        // Find next step based on workflow structure
        const nextStep = this.findNextStepInWorkflow(workflow, currentStep.id);
        if (nextStep) {
            return {
                stepId: currentStep.id,
                result: 'continue',
                nextSteps: [nextStep.id],
                reason: `Dependencies satisfied, continuing to ${nextStep.name}`
            };
        }
        return {
            stepId: currentStep.id,
            result: 'continue',
            nextSteps: [],
            reason: 'No more steps in workflow'
        };
    }
    async handleConditionalRouting(workflow, currentStep, state, result) {
        if (!currentStep.condition) {
            return {
                stepId: currentStep.id,
                result: 'continue',
                nextSteps: [],
                reason: 'No condition defined'
            };
        }
        try {
            const conditionResult = await this.conditionEvaluator.evaluate(currentStep.condition, {
                ...state.data,
                variables: state.variables,
                stepResult: result.data
            });
            if (conditionResult) {
                // Condition met, continue to next step
                const nextStep = this.findNextStepInWorkflow(workflow, currentStep.id);
                if (nextStep) {
                    return {
                        stepId: currentStep.id,
                        result: 'continue',
                        nextSteps: [nextStep.id],
                        reason: `Condition met, continuing to ${nextStep.name}`
                    };
                }
                return {
                    stepId: currentStep.id,
                    result: 'continue',
                    nextSteps: [],
                    reason: 'Condition met, no more steps'
                };
            }
            else {
                // Condition not met, skip this step
                return {
                    stepId: currentStep.id,
                    result: 'skip',
                    reason: 'Condition not met'
                };
            }
        }
        catch (error) {
            // Condition evaluation failed
            return {
                stepId: currentStep.id,
                result: 'abort',
                reason: `Condition evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async handleDefaultRouting(workflow, currentStep, state, result) {
        const nextStep = this.findNextStepInWorkflow(workflow, currentStep.id);
        if (nextStep) {
            return {
                stepId: currentStep.id,
                result: 'continue',
                nextSteps: [nextStep.id],
                reason: `Continuing to ${nextStep.name}`
            };
        }
        // Check if we should retry based on failure
        if (!result.success && currentStep.retryCount && currentStep.retryCount > 0) {
            const retryCount = state.history.filter(step => step.stepId === currentStep.id).length;
            if (retryCount < currentStep.retryCount) {
                return {
                    stepId: currentStep.id,
                    result: 'retry',
                    reason: `Step failed, retrying (${retryCount}/${currentStep.retryCount})`
                };
            }
        }
        return {
            stepId: currentStep.id,
            result: 'continue',
            nextSteps: [],
            reason: 'No more steps in workflow'
        };
    }
    async checkDependencies(dependencies, state) {
        for (const dependency of dependencies) {
            const completed = state.history.some(step => step.stepId === dependency && step.status === 'completed');
            if (!completed) {
                return false;
            }
        }
        return true;
    }
    findNextStepInWorkflow(workflow, currentStepId) {
        const stepIds = Object.keys(workflow.steps);
        const currentIndex = stepIds.indexOf(currentStepId);
        if (currentIndex !== -1 && currentIndex < stepIds.length - 1) {
            const nextStepId = stepIds[currentIndex + 1];
            return workflow.steps[nextStepId];
        }
        return null;
    }
    async evaluateDynamicRouting(workflow, currentStep, state, result) {
        // More sophisticated routing logic could go here
        // This could include:
        // - Machine learning-based routing
        // - Business rule evaluation
        // - Performance-based routing
        // - Historical data analysis
        return await this.decideNextStep(workflow, currentStep, state, result);
    }
}
exports.RoutingEngine = RoutingEngine;
//# sourceMappingURL=routing-engine.js.map