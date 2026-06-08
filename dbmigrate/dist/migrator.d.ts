import { Config, Migration, MigrationResult } from './types';
import { Logger } from './logger';
export declare class Migrator {
    private config;
    private driver;
    private logger;
    constructor(config: Config, logger?: Logger);
    private createDriver;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getStatus(): Promise<{
        applied: Migration[];
        pending: Migration[];
    }>;
    getPending(): Promise<Migration[]>;
    getNext(): Promise<Migration | null>;
    migrate(dryRun?: boolean, verbose?: boolean): Promise<MigrationResult>;
    rollback(to?: string, steps?: number): Promise<MigrationResult>;
    reset(): Promise<void>;
}
//# sourceMappingURL=migrator.d.ts.map