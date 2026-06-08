import { GoldenSet, PromptSnapshot, BisectConfig } from './types';
export declare class SnapshotStore {
    private config;
    constructor(config?: Partial<BisectConfig>);
    /** Initialize the snapshots directory and golden set file. */
    init(): void;
    /** Load the golden set from disk. */
    load(): GoldenSet;
    /** Save the golden set to disk. */
    save(golden: GoldenSet): void;
    /** Add a snapshot to the golden set. */
    add(snapshot: PromptSnapshot): void;
    /** Remove a snapshot by id. */
    remove(id: string): boolean;
    /** Get a snapshot by id. */
    get(id: string): PromptSnapshot | undefined;
    /** List all snapshots, optionally filtered by tag or model. */
    list(filters?: {
        tag?: string;
        model?: string;
    }): PromptSnapshot[];
    /** Save a history snapshot (for bisect tracking). */
    saveHistory(snapshot: PromptSnapshot): void;
    /** Load all history snapshots, sorted by timestamp. */
    loadHistory(promptId?: string): PromptSnapshot[];
    /** Import snapshots from a JSON file. */
    import(filePath: string): number;
    /** Export golden set to a file. */
    export(outputPath: string): void;
    private goldenPath;
}
//# sourceMappingURL=store.d.ts.map