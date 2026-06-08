export interface Config {
    driver: 'sqlite' | 'postgresql' | 'mysql';
    database: string;
    migrationsDir: string;
    tableName: string;
    transaction: boolean;
}
export interface Migration {
    timestamp: number;
    name: string;
    path: string;
    version: string;
    up: string;
    down?: string;
}
export interface MigrationStatus {
    timestamp: number;
    name: string;
    version: string;
    appliedAt: Date;
}
export interface MigrationResult {
    success: boolean;
    migrations: string[];
    errors?: string[];
}
export interface DatabaseDriver {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(sql: string, params?: any[]): Promise<any>;
    query(sql: string, params?: any[]): Promise<any>;
    createTable(): Promise<void>;
    getMigrations(): Promise<MigrationStatus[]>;
    markMigration(migration: Migration): Promise<void>;
    unmarkMigration(migration: Migration): Promise<void>;
}
export interface Logger {
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}
//# sourceMappingURL=types.d.ts.map