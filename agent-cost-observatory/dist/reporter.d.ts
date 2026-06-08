export declare class ReportGenerator {
    private tracker;
    constructor(databasePath: string);
    generateReport(options?: {
        agentName?: string;
        days?: number;
        format?: 'json' | 'table' | 'summary';
    }): Promise<string>;
    private generateJsonReport;
    private generateTableReport;
    private generateSummaryReport;
    private calculateEfficiencyScore;
    private generateSummary;
    getRecommendations(agentName?: string): Promise<string[]>;
    close(): void;
}
//# sourceMappingURL=reporter.d.ts.map