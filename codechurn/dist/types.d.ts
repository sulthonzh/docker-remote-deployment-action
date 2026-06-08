/**
 * codechurn - AI vs Human code quality tracker
 * Attributes code lines to AI or human authors, then tracks what happens to them over time.
 */
export interface CommitInfo {
    hash: string;
    author: string;
    date: string;
    message: string;
    isAI: boolean;
    aiModel?: string;
}
export interface BlameLine {
    file: string;
    line: number;
    content: string;
    commitHash: string;
    author: string;
    date: string;
}
export interface FileChurnStats {
    file: string;
    totalLines: number;
    aiLines: number;
    humanLines: number;
    aiLinesSurvived: number;
    humanLinesSurvived: number;
    aiChurnRate: number;
    humanChurnRate: number;
    aiSurvivalRate: number;
    humanSurvivalRate: number;
    revisions: RevisionRecord[];
    hotspotScore?: number;
}
export interface RevisionRecord {
    hash: string;
    author: string;
    date: string;
    message: string;
    isAI: boolean;
    linesAdded: number;
    linesRemoved: number;
}
export interface ChurnReport {
    repo: string;
    branch: string;
    since: string;
    until: string;
    totalCommits: number;
    aiCommits: number;
    humanCommits: number;
    files: FileChurnStats[];
    summary: {
        totalLines: number;
        aiLines: number;
        humanLines: number;
        aiChurnRate: number;
        humanChurnRate: number;
        aiSurvivalRate: number;
        humanSurvivalRate: number;
        revertRate: {
            ai: number;
            human: number;
        };
        avgLifetime: {
            ai: number;
            human: number;
        };
        hotspots: string[];
    };
    modelBreakdown?: Record<string, {
        commits: number;
        lines: number;
        churnRate: number;
        survivalRate: number;
    }>;
}
export interface AttributionConfig {
    aiPatterns: string[];
    aiAuthors: string[];
    modelPatterns: Record<string, string[]>;
    commitConvention: 'conventional' | 'co-authored' | 'both' | 'auto';
}
export interface AIDetection {
    patterns: RegExp[];
    minCommits: number;
}
export interface Weights {
    churn: number;
    survival: number;
    volume: number;
}
export interface Thresholds {
    highChurn: number;
    lowSurvival: number;
    minHotspotLines: number;
}
export interface ChurnConfig {
    aiDetection: AIDetection;
    minLines: number;
    weights?: Weights;
    skipPatterns?: RegExp[];
    reportFormat?: 'detailed' | 'summary' | 'minimal';
    thresholds?: Thresholds;
}
//# sourceMappingURL=types.d.ts.map