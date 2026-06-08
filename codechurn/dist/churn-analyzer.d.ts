import { ChurnReport, ChurnConfig } from './types';
export interface AnalysisOptions {
    since?: string;
    until?: string;
    author?: string;
    files?: string[];
    top?: number;
    minCommits?: number;
    config?: ChurnConfig;
}
export declare class ChurnAnalyzer {
    private git;
    constructor(repoPath?: string);
    /**
     * Run full churn analysis
     */
    analyze(options?: AnalysisOptions): ChurnReport;
    /**
     * Calculate hotspot score for ranking files
     */
    private calculateHotspotScore;
    /**
     * Build per-file statistics from commit history
     */
    private buildFileStats;
    /**
     * Skip binary/non-code files based on configuration
     */
    private shouldSkip;
    private weightedAverage;
    private calcAvgLifetime;
    private buildModelBreakdown;
    /**
     * Get default configuration
     */
    private getDefaultConfig;
}
//# sourceMappingURL=churn-analyzer.d.ts.map