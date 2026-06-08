export interface CodeQualityConfig {
    enabled: {
        complexity: boolean;
        maintainability: boolean;
        performance: boolean;
        security: boolean;
        bestPractices: boolean;
        documentation: boolean;
    };
    thresholds: {
        complexity: {
            maxCyclomatic: number;
            maxCognitive: number;
            maxNesting: number;
        };
        maintainability: {
            maxLinesPerFile: number;
            maxFunctionsPerFile: number;
            maxArguments: number;
        };
        performance: {
            maxFunctions: number;
            maxDepth: number;
        };
        security: {
            allowedFunctions: string[];
            bannedPatterns: string[];
        };
    };
    exclude: {
        directories: string[];
        files: string[];
        patterns: string[];
    };
    output: {
        format: 'json' | 'table' | 'markdown' | 'html';
        includeDetails: boolean;
        includeSuggestions: boolean;
    };
    ai: {
        enabled: boolean;
        apiKey?: string;
        model?: string;
        maxTokens?: number;
    };
}
export interface FileMetrics {
    path: string;
    lines: number;
    functions: number;
    classes: number;
    complexity: {
        cyclomatic: number;
        cognitive: number;
        nesting: number;
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
    issues: QualityIssue[];
    suggestions: string[];
}
export interface QualityIssue {
    type: 'complexity' | 'maintainability' | 'performance' | 'security' | 'best-practices' | 'documentation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    rule: string;
    message: string;
    line: number;
    column: number;
    suggestion?: string;
    evidence?: string;
}
export interface AnalysisResult {
    summary: {
        totalFiles: number;
        totalLines: number;
        totalFunctions: number;
        averageComplexity: number;
        averageMaintainability: number;
        overallScore: number;
        issuesCount: {
            total: number;
            bySeverity: {
                critical: number;
                high: number;
                medium: number;
                low: number;
            };
            byType: {
                complexity: number;
                maintainability: number;
                performance: number;
                security: number;
                bestPractices: number;
                documentation: number;
            };
        };
    };
    files: FileMetrics[];
    recommendations: string[];
    patterns: {
        commonIssues: string[];
        improvementAreas: string[];
        riskFactors: string[];
    };
}
export interface AIGeneratedInsights {
    summary: string;
    topIssues: Array<{
        issue: string;
        impact: string;
        suggestion: string;
    }>;
    overallAssessment: string;
    improvementSuggestions: string[];
    recommendedActions: Array<{
        priority: 'high' | 'medium' | 'low';
        action: string;
        estimatedEffort: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map