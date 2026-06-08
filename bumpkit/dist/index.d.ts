export interface Commit {
    hash: string;
    message: string;
    date: string;
    author: string;
    type: string;
    scope?: string;
    description: string;
    breaking: boolean;
}
export interface BumpResult {
    currentVersion: string;
    newVersion: string;
    bumpType: 'patch' | 'minor' | 'major' | 'none';
    commits: Commit[];
    breakingChanges: Commit[];
    features: Commit[];
    fixes: Commit[];
    other: Commit[];
}
export interface ChangelogOptions {
    version?: string;
    date?: string;
    title?: string;
    commitRange?: string;
}
export declare function parseCommitMessage(message: string): Omit<Commit, 'hash' | 'date' | 'author'>;
export declare function categorizeCommits(commits: Commit[]): Pick<BumpResult, 'breakingChanges' | 'features' | 'fixes' | 'other'>;
export declare function determineBump(commits: Commit[]): 'major' | 'minor' | 'patch' | 'none';
export declare function bumpVersion(current: string, bumpType: 'major' | 'minor' | 'patch' | 'none' | 'prerelease'): string;
export declare function getCommitsSinceTag(tag?: string): Commit[];
export declare function getLatestTag(): string | null;
export declare function getCurrentVersionFromPackage(dir?: string): string | null;
export declare function analyze(tag?: string, currentVersion?: string): BumpResult;
export declare function generateChangelog(result: BumpResult, options?: ChangelogOptions): string;
export declare function formatText(result: BumpResult): string;
export declare function formatJSON(result: BumpResult): string;
