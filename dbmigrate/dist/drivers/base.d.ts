import { DatabaseDriver, MigrationStatus } from '../types';
export declare abstract class BaseDriver implements DatabaseDriver {
    protected db: any;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract execute(sql: string, params?: any[]): Promise<any>;
    abstract query(sql: string, params?: any[]): Promise<any>;
    createTable(): Promise<void>;
    getMigrationsTableName(): string;
    getMigrations(): Promise<MigrationStatus[]>;
    markMigration(migration: {
        timestamp: number;
        name: string;
        version: string;
    }): Promise<void>;
    unmarkMigration(migration: {
        timestamp: number;
        name: string;
        version: string;
    }): Promise<void>;
    protected isTableNotFoundError(error: any): boolean;
    protected formatTimestamp(timestamp: number): string;
}
//# sourceMappingURL=base.d.ts.map