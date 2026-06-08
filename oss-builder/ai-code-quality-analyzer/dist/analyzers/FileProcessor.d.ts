import { CodeQualityConfig } from '../types';
export interface FunctionInfo {
    name: string;
    startLine: number;
    endLine: number;
    complexity: number;
    cognitive: number;
    nesting: number;
    arguments: number;
    returnType?: string;
}
export interface ClassInfo {
    name: string;
    startLine: number;
    endLine: number;
    methods: FunctionInfo[];
    complexity: number;
}
export interface Metrics {
    functions: FunctionInfo[];
    classes: ClassInfo[];
    complexity: {
        cyclomatic: number;
        cognitive: number;
        nesting: number;
        cyclomaticLine?: number;
        cognitiveLine?: number;
        nestingLine?: number;
    };
    maintainability: {
        score: number;
        halstead: {
            difficulty: number;
            volume: number;
            effort: number;
        };
        maintainabilityIndex: number;
    };
    content: string;
    bannedPatternLines?: number[];
}
export declare class FileProcessor {
    private config;
    constructor(config: CodeQualityConfig);
    processFile(filePath: string, content: string): Promise<Metrics>;
    private extractFunctions;
    private extractClasses;
    private extractClassMethods;
    private getFunctionBody;
    private getClassBody;
    private calculateComplexity;
    private calculateNestingDepth;
    private calculateMaintainability;
    private calculateHalsteadMetrics;
    private calculateMaintainabilityIndex;
    private checkBannedPatterns;
    private findFunctionStart;
}
//# sourceMappingURL=FileProcessor.d.ts.map