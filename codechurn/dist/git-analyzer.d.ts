import { AttributionConfig, CommitInfo } from './types';
declare const DEFAULT_CONFIG: AttributionConfig;
export declare class GitAnalyzer {
    private repoPath;
    private config;
    constructor(repoPath?: string, config?: Partial<AttributionConfig>);
    /**
     * Check if a commit is authored by AI based on patterns
     */
    isAICommit(commit: CommitInfo): boolean;
    /**
     * Detect which AI model produced a commit
     */
    detectModel(commit: CommitInfo): string | undefined;
    /**
     * Get commit log with AI attribution
     */
    getCommitLog(since?: string, until?: string, author?: string, aiDetection?: any): CommitInfo[];
    /**
     * Get diff stats for a specific commit
     */
    getCommitDiffStats(hash: string): {
        files: Record<string, {
            added: number;
            removed: number;
        }>;
    };
    /**
     * Get list of changed files between two refs
     */
    getChangedFiles(sinceRef?: string): string[];
    /**
     * Get blame data for a file at a specific ref
     */
    getBlame(file: string, ref?: string): Array<{
        hash: string;
        author: string;
        date: string;
        line: number;
        content: string;
    }>;
    /**
     * Get the current branch name
     */
    getBranch(): string;
    /**
     * Get repo name from remote
     */
    getRepoName(): string;
    getConfig(): AttributionConfig;
}
export { DEFAULT_CONFIG };
//# sourceMappingURL=git-analyzer.d.ts.map