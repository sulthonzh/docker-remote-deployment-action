import { CodeQualityConfig, AnalysisResult } from '../types';
export declare class CodeQualityAnalyzer {
    private config;
    private fileProcessor;
    constructor(config: CodeQualityConfig);
    scanFiles(scanPath: string, options: any): Promise<string[]>;
    analyzeFiles(files: string[]): Promise<AnalysisResult>;
    private analyzeFile;
    private checkViolations;
    private groupIssuesBySeverity;
    private groupIssuesByType;
    private calculateOverallScore;
    private generateRecommendations;
    private identifyPatterns;
    private generateFileSuggestions;
}
//# sourceMappingURL=CodeQualityAnalyzer.d.ts.map