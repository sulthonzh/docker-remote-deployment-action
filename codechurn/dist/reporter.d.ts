import { ChurnReport } from './types';
export declare class Reporter {
    /**
     * Format a churn report as a human-readable table
     */
    formatReport(report: ChurnReport): string;
    /**
     * Format as JSON
     */
    formatJSON(report: ChurnReport): string;
    /**
     * Format as markdown
     */
    formatMarkdown(report: ChurnReport): string;
    private pct;
    private fmt;
    private padR;
    private padL;
}
//# sourceMappingURL=reporter.d.ts.map