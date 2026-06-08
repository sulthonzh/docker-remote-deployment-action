import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';
export declare class SQLiteDriver extends BaseDriver implements DatabaseDriver {
    private dbPath;
    constructor(database: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<void>;
    query(sql: string, params?: any[]): Promise<any[]>;
    getMigrationsTableName(): string;
}
//# sourceMappingURL=sqlite.d.ts.map