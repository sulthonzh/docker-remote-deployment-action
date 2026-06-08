import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';
export declare class MySQLDriver extends BaseDriver implements DatabaseDriver {
    private connectionString;
    constructor(database: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<void>;
    query(sql: string, params?: any[]): Promise<any[]>;
    createTable(): Promise<void>;
}
//# sourceMappingURL=mysql.d.ts.map