export interface ConditionContext {
    [key: string]: any;
    variables?: Record<string, any>;
    stepResult?: any;
}
export declare class ConditionEvaluator {
    private operators;
    constructor();
    evaluate(condition: string, context: ConditionContext): Promise<boolean>;
    private initializeOperators;
    private evaluateVariable;
    private evaluateComplexCondition;
    private tokenize;
    private infixToPostfix;
    private evaluatePostfix;
    private evaluateValue;
    private getVariableValue;
    private isOperator;
    private getPrecedence;
    evaluateConditions(conditions: string[], context: ConditionContext, operator?: 'and' | 'or'): boolean;
    validateCondition(condition: string): {
        valid: boolean;
        error?: string;
    };
}
//# sourceMappingURL=condition-evaluator.d.ts.map