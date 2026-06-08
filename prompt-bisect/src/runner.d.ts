import { RunResult, PromptSnapshot, BisectConfig } from './types';
export declare class BisectRunner {
    private store;
    private config;
    constructor(config?: Partial<BisectConfig>);
    /**
     * Run a regression check: compare new outputs against the golden set.
     * Pass a `fetchOutput` function that returns the actual output for each prompt.
     */
    run(fetchOutput: (snapshot: PromptSnapshot) => Promise<string>): Promise<RunResult>;
    /**
     * Run a dry comparison against provided outputs (no fetching).
     */
    compare(outputs: {
        id: string;
        output: string;
    }[]): RunResult;
    /**
     * Bisect: find when a prompt's output first drifted.
     * Walks through history chronologically and finds the first point where
     * similarity dropped below threshold.
     */
    bisect(promptId: string): import('./types').BisectResult | null;
    private computeSimilarity;
    private getStatus;
    private describeDiff;
}
//# sourceMappingURL=runner.d.ts.map