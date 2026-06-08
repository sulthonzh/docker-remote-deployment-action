import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';
export declare class PostgreSQLDriver extends BaseDriver implements DatabaseDriver {
    private connectionString;
    constructor(database: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<void>;
    query(sql: string, params?: any[]): Promise<any[]>;
    createTable(): Promise<void>;
}
//# sourceMappingURL=postgresql.d.ts.map