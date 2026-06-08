export interface Config {
    dbPath: string;
    logLevel: "debug" | "info" | "warn" | "error";
    maxTokenBatchSize: number;
    costModel: {
        inputCostPer1k: number;
        outputCostPer1k: number;
        modelSpecific: Record<string, {
            inputCostPer1k: number;
            outputCostPer1k: number;
        }>;
    };
    tracking: {
        enableDetailedTracking: boolean;
        trackErrorDetails: boolean;
        retentionDays: number;
    };
    alerts: {
        enableCostAlerts: boolean;
        costThreshold: number;
        tokenThreshold: number;
        alertChannel?: string;
    };
    mcp: {
        port: number;
        host: string;
        enableHttp: boolean;
        corsOrigins: string[];
    };
}
export declare const defaultConfig: Config;
export declare class ConfigManager {
    private config;
    private configPath;
    constructor(customConfigPath?: string);
    initialize(): Promise<void>;
    loadConfig(): Promise<void>;
    saveConfig(): Promise<void>;
    getConfig(): Config;
    updateConfig(updates: Partial<Config>): void;
    getDbPath(): string;
    getLogLevel(): Config["logLevel"];
    getMaxTokenBatchSize(): number;
    getCostForModel(model: string, inputTokens: number, outputTokens: number): number;
    getMcpConfig(): Config["mcp"];
    getTrackingConfig(): Config["tracking"];
    getAlertsConfig(): Config["alerts"];
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
    private applyEnvironmentOverrides;
    private setNestedValue;
    private parseEnvValue;
    private deepMerge;
    generateConfigExample(): string;
}
//# sourceMappingURL=config.d.ts.map