"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessor = void 0;
class FileProcessor {
    constructor(config) {
        this.config = config;
    }
    async processFile(filePath, content) {
        const lines = content.split('\n');
        const functions = this.extractFunctions(content, lines);
        const classes = this.extractClasses(content, lines);
        const complexity = this.calculateComplexity(content, functions, classes);
        const maintainability = this.calculateMaintainability(content, functions);
        const metrics = {
            functions,
            classes,
            complexity,
            maintainability,
            content,
            bannedPatternLines: this.checkBannedPatterns(content),
        };
        return metrics;
    }
    extractFunctions(content, lines) {
        const functions = [];
        // Regex patterns for function detection
        const functionPatterns = [
            // Regular function declarations
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*{/g,
            // Arrow functions
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*=>\s*{/g,
            // Class methods
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*{/g,
            // Async functions
            /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*{/g,
            // Async arrow functions
            /async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*=>\s*{/g,
        ];
        let match;
        for (const pattern of functionPatterns) {
            let lastIndex = 0;
            while ((match = pattern.exec(content)) !== null) {
                const functionName = match[1] || '';
                const argsString = match[2];
                const returnType = match[3];
                // Skip if it's a constructor
                if (functionName === 'constructor')
                    continue;
                // Calculate function start and end lines
                const startLine = content.substring(0, match.index).split('\n').length;
                const functionBody = this.getFunctionBody(content, match.index);
                const endLine = startLine + functionBody.split('\n').length - 1;
                // Count arguments
                const argumentsCount = argsString ? argsString.split(',').filter(arg => arg.trim()).length : 0;
                const functionInfo = {
                    name: functionName || 'anonymous',
                    startLine,
                    endLine,
                    complexity: 0,
                    cognitive: 0,
                    nesting: 0,
                    arguments: argumentsCount,
                    returnType: returnType || 'void',
                };
                functions.push(functionInfo);
                lastIndex = match.index + 1;
            }
        }
        return functions;
    }
    extractClasses(content, lines) {
        const classes = [];
        const classPattern = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*{/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            const className = match[1] || '';
            const startLine = content.substring(0, match.index).split('\n').length;
            const classBody = this.getClassBody(content, match.index);
            const endLine = startLine + classBody.split('\n').length - 1;
            // Extract methods from class
            const methods = this.extractClassMethods(classBody);
            const classInfo = {
                name: className || 'anonymous',
                startLine,
                endLine,
                methods,
                complexity: 0,
            };
            classes.push(classInfo);
        }
        return classes;
    }
    extractClassMethods(classBody) {
        const methods = [];
        const methodPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*{/g;
        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            const methodName = match[1] || '';
            const argsString = match[2];
            const returnType = match[3];
            // Calculate method start and end lines within class body
            const startLine = classBody.substring(0, match.index).split('\n').length;
            const methodBody = this.getFunctionBody(classBody, match.index);
            const endLine = startLine + methodBody.split('\n').length - 1;
            // Count arguments
            const argumentsCount = argsString ? argsString.split(',').filter(arg => arg.trim()).length : 0;
            const methodInfo = {
                name: methodName || 'anonymous',
                startLine,
                endLine,
                complexity: 0,
                cognitive: 0,
                nesting: 0,
                arguments: argumentsCount,
                returnType: returnType || 'void',
            };
            methods.push(methodInfo);
        }
        return methods;
    }
    getFunctionBody(content, startIndex) {
        let braceCount = 0;
        let inString = false;
        let stringChar = '';
        let escapeNext = false;
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\' && inString) {
                escapeNext = true;
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                if (inString && char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
            }
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                }
                else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return content.substring(startIndex, i + 1);
                    }
                }
            }
        }
        return content.substring(startIndex);
    }
    getClassBody(content, startIndex) {
        let braceCount = 0;
        let inString = false;
        let stringChar = '';
        let escapeNext = false;
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\' && inString) {
                escapeNext = true;
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                if (inString && char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
            }
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                }
                else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return content.substring(startIndex, i + 1);
                    }
                }
            }
        }
        return content.substring(startIndex);
    }
    calculateComplexity(content, functions, classes) {
        let totalCyclomatic = 1; // Base complexity
        let totalCognitive = 0;
        let maxNesting = 0;
        // Track line numbers for complexity issues
        let cyclomaticLine = 1;
        let cognitiveLine = 1;
        let nestingLine = 1;
        // Cyclomatic complexity factors
        const complexityFactors = [
            /\bif\b/g, /\belse\b/g, /\belse if\b/g, /\bwhile\b/g, /\bfor\b/g,
            /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\bthrow\b/g,
            /\b&&\b/g, /\b\|\|\b/g, /\?\b/g, /\b:\b/g
        ];
        // Cognitive complexity factors
        const cognitiveFactors = [
            /if\s*\(/g, /while\s*\(/g, /for\s*\(/g, /switch\s*\(/g,
            /catch\s*\(/g, /&&/g, /\|\|/g, /\?/g
        ];
        // Analyze each function
        functions.forEach(func => {
            let funcComplexity = 1;
            let funcCognitive = 0;
            let funcNesting = 0;
            const functionContent = this.getFunctionBody(content, this.findFunctionStart(content, func));
            // Cyclomatic complexity
            complexityFactors.forEach(pattern => {
                const matches = functionContent.match(pattern);
                if (matches) {
                    funcComplexity += matches.length;
                }
            });
            // Cognitive complexity
            cognitiveFactors.forEach(pattern => {
                const matches = functionContent.match(pattern);
                if (matches) {
                    funcCognitive += matches.length;
                }
            });
            // Nesting depth
            funcNesting = this.calculateNestingDepth(functionContent);
            totalCyclomatic += funcComplexity - 1;
            totalCognitive += funcCognitive;
            maxNesting = Math.max(maxNesting, funcNesting);
            func.complexity = funcComplexity;
            func.cognitive = funcCognitive;
            func.nesting = funcNesting;
            // Track line numbers
            cyclomaticLine = Math.max(cyclomaticLine, func.startLine);
            cognitiveLine = Math.max(cognitiveLine, func.startLine);
            nestingLine = Math.max(nestingLine, func.startLine);
        });
        // Analyze classes
        classes.forEach(cls => {
            cls.complexity = 1; // Base complexity
            cls.methods.forEach(method => {
                cls.complexity += method.complexity - 1;
            });
            totalCyclomatic += cls.complexity - 1;
        });
        return {
            cyclomatic: totalCyclomatic,
            cognitive: totalCognitive,
            nesting: maxNesting,
            cyclomaticLine,
            cognitiveLine,
            nestingLine,
        };
    }
    calculateNestingDepth(content) {
        let maxDepth = 0;
        let currentDepth = 0;
        let inString = false;
        let stringChar = '';
        let escapeNext = false;
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\' && inString) {
                escapeNext = true;
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                if (inString && char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                else if (!inString) {
                    inString = true;
                    stringChar = char;
                }
            }
            if (!inString) {
                if (char === '{') {
                    currentDepth++;
                    maxDepth = Math.max(maxDepth, currentDepth);
                }
                else if (char === '}') {
                    currentDepth--;
                }
            }
        }
        return maxDepth;
    }
    calculateMaintainability(content, functions) {
        // Calculate Halstead metrics
        const halstead = this.calculateHalsteadMetrics(content);
        // Maintainability index (MI) calculation
        const maintainabilityIndex = this.calculateMaintainabilityIndex(halstead.difficulty, halstead.volume, halstead.effort);
        const maintainabilityScore = Math.max(0, Math.min(100, maintainabilityIndex));
        return {
            score: maintainabilityScore,
            halstead,
            maintainabilityIndex,
        };
    }
    calculateHalsteadMetrics(content) {
        // Count operators and operands
        const operators = content.match(/[\+\-\*\/\%\&\|\~\!\=\>\<\{\}\[\]\(\)\;\,\.\:\?]/g) || [];
        const operands = content.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+/g) || [];
        const uniqueOperators = new Set(operators).size;
        const uniqueOperands = new Set(operands).size;
        const totalOperators = operators.length;
        const totalOperands = operands.length;
        // Calculate Halstead metrics
        const length = totalOperators + totalOperands;
        const vocabulary = uniqueOperators + uniqueOperands;
        const volume = length * Math.log2(vocabulary);
        const difficulty = (uniqueOperators / 2) * (totalOperands / uniqueOperands);
        const effort = volume * difficulty;
        return {
            difficulty,
            volume,
            effort,
        };
    }
    calculateMaintainabilityIndex(difficulty, volume, effort) {
        // MI = max(0, (171 - 5.2 * log10(difficulty) - 0.23 * log10(volume) - 16.2 * log10(effort)) * 100 / 171)
        const log10 = (x) => Math.log(x) / Math.log(10);
        const mi = 171 - 5.2 * log10(difficulty) - 0.23 * log10(volume) - 16.2 * log10(effort);
        const normalizedMi = (mi * 100) / 171;
        return normalizedMi;
    }
    checkBannedPatterns(content) {
        const lines = [];
        this.config.thresholds.security.bannedPatterns.forEach((pattern, index) => {
            const regex = new RegExp(pattern);
            const matches = content.match(regex);
            if (matches) {
                // Find line numbers for each match
                matches.forEach(match => {
                    const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
                    if (!lines.includes(lineNum)) {
                        lines.push(lineNum);
                    }
                });
            }
        });
        return lines;
    }
    findFunctionStart(content, func) {
        // Find the actual start of the function in the content
        // This is a simplified version - in practice, you'd need more sophisticated parsing
        let lines = content.split('\n');
        let currentLine = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line?.includes(func.name) && line.includes('(') && line.includes(')')) {
                return content.split('\n').slice(0, i).join('\n').length + line.indexOf(func.name);
            }
        }
        return 0;
    }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=FileProcessor.js.map