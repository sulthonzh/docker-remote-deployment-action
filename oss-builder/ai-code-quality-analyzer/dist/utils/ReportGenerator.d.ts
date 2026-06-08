import { AnalysisResult, AIGeneratedInsights } from '../types';
export declare class ReportGenerator {
    private config;
    constructor(config: any);
    generateReport(result: AnalysisResult, aiInsights: AIGeneratedInsights | null, format?: string, outputPath?: string, title?: string, template?: string): Promise<void>;
    private generateTableReport;
    private generateJsonReport;
    private generateMarkdownReport;
    private generateHtmlReport;
    private generateRecommendationsHtml;
    private generateAIInsightsHtml;
    private generateCommonPatternsHtml;
    private calculateFileScore;
    private scoreColor;
    private issueCountColor;
    private severityColor;
    private typeColor;
    private getScoreClass;
}
//# sourceMappingURL=ReportGenerator.d.ts.map