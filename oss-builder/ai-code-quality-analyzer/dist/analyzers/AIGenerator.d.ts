import { AnalysisResult, AIGeneratedInsights } from '../types';
export declare class AIGenerator {
    private config;
    constructor(config: any);
    generateInsights(analysisResult: AnalysisResult): Promise<AIGeneratedInsights>;
    private generateSummary;
    private identifyTopIssues;
    private generateOverallAssessment;
    private generateImprovementSuggestions;
    private generateRecommendedActions;
    private getImpactLevel;
    private getSuggestionForType;
    private getRelativePath;
}
//# sourceMappingURL=AIGenerator.d.ts.map