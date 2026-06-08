import { CodeQualityConfig } from '../types';
export declare class ConfigManager {
    private configPath;
    constructor(configPath?: string);
    loadConfig(): CodeQualityConfig;
    getDefaultConfig(): CodeQualityConfig;
    getPreset(presetName: string): CodeQualityConfig | null;
    validateConfig(config: CodeQualityConfig): {
        valid: boolean;
        errors: string[];
    };
    private mergeWithDefaults;
    getConfigPath(): string;
}
//# sourceMappingURL=ConfigManager.d.ts.map