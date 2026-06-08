import { Config, Migration } from './types';
export declare function readConfig(configPath?: string): Config;
export declare function writeConfig(config: Config, configPath?: string): void;
export declare function createMigrationFile(config: Config, description: string): string;
export declare function loadMigrations(config: Config): Migration[];
export declare function formatTimestamp(timestamp: number): string;
export declare function formatDuration(ms: number): string;
//# sourceMappingURL=utils.d.ts.map