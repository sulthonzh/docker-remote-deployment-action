"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath || path_1.default.join(process.cwd(), '.ai-quality.json');
    }
    loadConfig() {
        if (!fs_extra_1.default.existsSync(this.configPath)) {
            return this.getDefaultConfig();
        }
        try {
            const configContent = fs_extra_1.default.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(configContent);
            return this.mergeWithDefaults(config);
        }
        catch (error) {
            console.warn(`Warning: Failed to load config from ${this.configPath}, using defaults`);
            return this.getDefaultConfig();
        }
    }
    getDefaultConfig() {
        return {
            enabled: {
                complexity: true,
                maintainability: true,
                performance: true,
                security: true,
                bestPractices: true,
                documentation: true,
            },
            thresholds: {
                complexity: {
                    maxCyclomatic: 10,
                    maxCognitive: 15,
                    maxNesting: 4,
                },
                maintainability: {
                    maxLinesPerFile: 200,
                    maxFunctionsPerFile: 15,
                    maxArguments: 5,
                },
                performance: {
                    maxFunctions: 10,
                    maxDepth: 5,
                },
                security: {
                    allowedFunctions: ['eval', 'setTimeout', 'setInterval'],
                    bannedPatterns: [
                        'eval\\(',
                        'innerHTML\\s*=',
                        'document\\.write',
                        'dangerouslySetInnerHTML',
                        '__dirname',
                        '__filename'
                    ],
                },
            },
            exclude: {
                directories: ['node_modules', 'dist', 'build', '.git', 'coverage', '.cache'],
                files: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js', '*.d.ts'],
                patterns: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
            },
            output: {
                format: 'table',
                includeDetails: false,
                includeSuggestions: true,
            },
            ai: {
                enabled: false,
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
            },
        };
    }
    getPreset(presetName) {
        const presets = {
            basic: {
                enabled: {
                    complexity: true,
                    maintainability: false,
                    performance: false,
                    security: false,
                    bestPractices: false,
                    documentation: false,
                },
                output: {
                    format: 'table',
                    includeDetails: false,
                    includeSuggestions: false,
                },
                ai: { enabled: false },
            },
            advanced: {
                enabled: {
                    complexity: true,
                    maintainability: true,
                    performance: true,
                    security: true,
                    bestPractices: true,
                    documentation: true,
                },
                output: {
                    format: 'json',
                    includeDetails: true,
                    includeSuggestions: true,
                },
                ai: { enabled: true },
            },
            strict: {
                enabled: {
                    complexity: true,
                    maintainability: true,
                    performance: true,
                    security: true,
                    bestPractices: true,
                    documentation: true,
                },
                thresholds: {
                    complexity: {
                        maxCyclomatic: 5,
                        maxCognitive: 8,
                        maxNesting: 2,
                    },
                    maintainability: {
                        maxLinesPerFile: 100,
                        maxFunctionsPerFile: 8,
                        maxArguments: 3,
                    },
                    performance: {
                        maxFunctions: 5,
                        maxDepth: 3,
                    },
                    security: {
                        allowedFunctions: ['eval', 'setTimeout', 'setInterval'],
                        bannedPatterns: [
                            'eval\(',
                            'innerHTML\s*=',
                            'document\.write',
                            'dangerouslySetInnerHTML'
                        ],
                    },
                },
                ai: { enabled: true },
            },
        };
        const preset = presets[presetName];
        return preset ? this.mergeWithDefaults(preset) : null;
    }
    validateConfig(config) {
        const errors = [];
        // Check enabled metrics
        const enabledCount = Object.values(config.enabled).filter(Boolean).length;
        if (enabledCount === 0) {
            errors.push('At least one quality metric must be enabled');
        }
        // Check thresholds
        if (config.thresholds.complexity.maxCyclomatic < 1) {
            errors.push('maxCyclomatic must be at least 1');
        }
        if (config.thresholds.complexity.maxCognitive < 1) {
            errors.push('maxCognitive must be at least 1');
        }
        if (config.thresholds.complexity.maxNesting < 1) {
            errors.push('maxNesting must be at least 1');
        }
        // Check AI configuration
        if (config.ai.enabled && !config.ai.apiKey) {
            errors.push('AI is enabled but no API key is provided');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    mergeWithDefaults(config) {
        const defaults = this.getDefaultConfig();
        return {
            ...defaults,
            ...config,
            enabled: { ...defaults.enabled, ...config.enabled },
            thresholds: { ...defaults.thresholds, ...config.thresholds },
            exclude: { ...defaults.exclude, ...config.exclude },
            output: { ...defaults.output, ...config.output },
            ai: { ...defaults.ai, ...config.ai },
        };
    }
    getConfigPath() {
        return this.configPath;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map