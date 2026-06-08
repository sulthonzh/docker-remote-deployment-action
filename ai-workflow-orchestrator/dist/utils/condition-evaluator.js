"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionEvaluator = void 0;
class ConditionEvaluator {
    operators;
    constructor() {
        this.operators = new Map();
        this.initializeOperators();
    }
    async evaluate(condition, context) {
        try {
            // Clean and normalize the condition
            const normalized = condition.trim().replace(/\s+/g, ' ');
            // Simple boolean conditions
            if (normalized === 'true')
                return true;
            if (normalized === 'false')
                return false;
            // Direct variable evaluation
            if (normalized.startsWith('${') && normalized.endsWith('}')) {
                const variable = normalized.slice(2, -1);
                return this.evaluateVariable(variable, context);
            }
            // Complex condition parsing
            return this.evaluateComplexCondition(normalized, context);
        }
        catch (error) {
            throw new Error(`Condition evaluation failed: ${condition} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    initializeOperators() {
        this.operators.set('==', (left, right) => left == right);
        this.operators.set('!=', (left, right) => left != right);
        this.operators.set('===', (left, right) => left === right);
        this.operators.set('!==', (left, right) => left !== right);
        this.operators.set('>', (left, right) => Number(left) > Number(right));
        this.operators.set('<', (left, right) => Number(left) < Number(right));
        this.operators.set('>=', (left, right) => Number(left) >= Number(right));
        this.operators.set('<=', (left, right) => Number(left) <= Number(right));
        this.operators.set('contains', (left, right) => String(left).includes(String(right)));
        this.operators.set('startsWith', (left, right) => String(left).startsWith(String(right)));
        this.operators.set('endsWith', (left, right) => String(left).endsWith(String(right)));
        this.operators.set('in', (left, right) => {
            if (Array.isArray(right)) {
                return right.includes(left);
            }
            return String(right).includes(String(left));
        });
        this.operators.set('&&', (left, right) => left && right);
        this.operators.set('||', (left, right) => left || right);
        this.operators.set('!', (left) => !left);
    }
    evaluateVariable(variable, context) {
        // Handle nested access like 'data.user.id'
        const parts = variable.split('.');
        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return false;
            }
        }
        return Boolean(value);
    }
    evaluateComplexCondition(condition, context) {
        // Convert condition tokens to postfix notation (Reverse Polish Notation)
        const tokens = this.tokenize(condition);
        const postfix = this.infixToPostfix(tokens);
        // Evaluate postfix expression
        return this.evaluatePostfix(postfix, context);
    }
    tokenize(condition) {
        const tokens = [];
        let i = 0;
        while (i < condition.length) {
            if (condition[i] === ' ') {
                i++;
                continue;
            }
            // Handle quoted strings
            if (condition[i] === '"' || condition[i] === "'") {
                const quote = condition[i];
                i++;
                let end = condition.indexOf(quote, i);
                if (end === -1)
                    end = condition.length;
                tokens.push(condition.slice(i, end));
                i = end + 1;
                continue;
            }
            // Handle multi-character operators
            const multiCharOps = ['==', '!=', '===', '!==', '>=', '<=', '&&', '||'];
            let matched = false;
            for (const op of multiCharOps) {
                if (condition.startsWith(op, i)) {
                    tokens.push(op);
                    i += op.length;
                    matched = true;
                    break;
                }
            }
            if (matched)
                continue;
            // Handle single-character operators and parentheses
            const singleCharOps = ['>', '<', '!', '(', ')'];
            if (singleCharOps.includes(condition[i])) {
                tokens.push(condition[i]);
                i++;
                continue;
            }
            // Handle variables and literals
            let j = i;
            while (j < condition.length &&
                !condition[j].match(/\s|[><=!&|()]/)) {
                j++;
            }
            if (j > i) {
                tokens.push(condition.slice(i, j));
                i = j;
            }
        }
        return tokens;
    }
    infixToPostfix(tokens) {
        const output = [];
        const operators = [];
        for (const token of tokens) {
            if (this.isOperator(token)) {
                while (operators.length > 0 &&
                    this.getPrecedence(operators[operators.length - 1]) >= this.getPrecedence(token) &&
                    operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.push(token);
            }
            else if (token === '(') {
                operators.push(token);
            }
            else if (token === ')') {
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.pop(); // Remove the '('
            }
            else {
                output.push(token);
            }
        }
        while (operators.length > 0) {
            output.push(operators.pop());
        }
        return output;
    }
    evaluatePostfix(postfix, context) {
        const stack = [];
        for (const token of postfix) {
            if (this.isOperator(token)) {
                const operator = token;
                if (operator === '!') {
                    // Unary operator
                    const operand = stack.pop();
                    stack.push(!this.evaluateValue(operand, context));
                }
                else if (operator === '&&' || operator === '||') {
                    // Binary operator
                    const right = stack.pop();
                    const left = stack.pop();
                    if (operator === '&&') {
                        stack.push(left && right);
                    }
                    else {
                        stack.push(left || right);
                    }
                }
                else {
                    // Other binary operators
                    const right = stack.pop();
                    const left = stack.pop();
                    const operatorFunc = this.operators.get(operator);
                    if (operatorFunc) {
                        stack.push(operatorFunc(left, right, context));
                    }
                    else {
                        throw new Error(`Unknown operator: ${operator}`);
                    }
                }
            }
            else {
                // Operand
                stack.push(this.evaluateValue(token, context));
            }
        }
        return Boolean(stack[0]);
    }
    evaluateValue(value, context) {
        // Handle boolean literals
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        // Handle numbers
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            return Number(value);
        }
        // Handle null/undefined
        if (value === 'null')
            return null;
        if (value === 'undefined')
            return undefined;
        // Handle variables
        if (value.startsWith('${') && value.endsWith('}')) {
            const variable = value.slice(2, -1);
            return this.getVariableValue(variable, context);
        }
        // Handle string literals (remove quotes if present)
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        // Return as-is (could be a variable name)
        return this.getVariableValue(value, context);
    }
    getVariableValue(variable, context) {
        const parts = variable.split('.');
        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    isOperator(token) {
        return this.operators.has(token) || ['!', '(', ')'].includes(token);
    }
    getPrecedence(operator) {
        switch (operator) {
            case '!':
                return 4;
            case '&&':
                return 3;
            case '||':
                return 2;
            case '==':
            case '!=':
            case '===':
            case '!==':
            case '>':
            case '<':
            case '>=':
            case '<=':
                return 1;
            default:
                return 0;
        }
    }
    // Helper methods for common conditions
    evaluateConditions(conditions, context, operator = 'and') {
        const results = conditions.map(condition => this.evaluate(condition, context));
        if (operator === 'and') {
            return results.every(result => result);
        }
        else {
            return results.some(result => result);
        }
    }
    validateCondition(condition) {
        try {
            // Basic validation - try to parse the condition
            this.tokenize(condition);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.ConditionEvaluator = ConditionEvaluator;
//# sourceMappingURL=condition-evaluator.js.map