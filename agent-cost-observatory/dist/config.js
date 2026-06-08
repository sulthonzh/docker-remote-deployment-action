"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = exports.defaultConfig = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
exports.defaultConfig = {
    dbPath: path_1.default.join(process.cwd(), "usage.db"),
    logLevel: "info",
    maxTokenBatchSize: 1000,
    costModel: {
        inputCostPer1k: 0.002,
        outputCostPer1k: 0.002,
        modelSpecific: {
            "gpt-3.5-turbo": { inputCostPer1k: 0.0015, outputCostPer1k: 0.002 },
            "gpt-4": { inputCostPer1k: 0.03, outputCostPer1k: 0.06 },
            "gpt-4-turbo": { inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
            "claude-3-haiku": { inputCostPer1k: 0.0025, outputCostPer1k: 0.0125 },
            "claude-3-sonnet": { inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
            "claude-3-opus": { inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
            "gemini-pro": { inputCostPer1k: 0.0005, outputCostPer1k: 0.0015 },
            "gemini-ultra": { inputCostPer1k: 0.0025, outputCostPer1k: 0.005 },
        },
    },
    tracking: {
        enableDetailedTracking: true,
        trackErrorDetails: true,
        retentionDays: 90,
    },
    alerts: {
        enableCostAlerts: true,
        costThreshold: 10.0,
        tokenThreshold: 1000000, // 1 million tokens
        alertChannel: "console",
    },
    mcp: {
        port: 3001,
        host: "localhost",
        enableHttp: false,
        corsOrigins: ["http://localhost:3000", "http://localhost:8080"],
    },
};
class ConfigManager {
    config;
    configPath;
    constructor(customConfigPath) {
        this.configPath = customConfigPath || path_1.default.join(process.env.HOME || "", ".aco", "config.json");
        this.config = { ...exports.defaultConfig };
    }
    async initialize() {
        try {
            // Ensure config directory exists
            const configDir = path_1.default.dirname(this.configPath);
            await fs_1.promises.mkdir(configDir, { recursive: true });
            // Check if config file exists
            try {
                await fs_1.promises.access(this.configPath);
                // Load existing config
                await this.loadConfig();
            }
            catch {
                // Create default config
                await this.saveConfig();
            }
            // Apply environment variable overrides
            this.applyEnvironmentOverrides();
        }
        catch (error) {
            throw new Error(`Failed to initialize configuration: ${error}`);
        }
    }
    async loadConfig() {
        try {
            const configContent = await fs_1.promises.readFile(this.configPath, "utf-8");
            const loadedConfig = JSON.parse(configContent);
            // Deep merge with defaults
            this.config = this.deepMerge(exports.defaultConfig, loadedConfig);
        }
        catch (error) {
            throw new Error(`Failed to load configuration: ${error}`);
        }
    }
    async saveConfig() {
        try {
            // Ensure directory exists
            const configDir = path_1.default.dirname(this.configPath);
            await fs_1.promises.mkdir(configDir, { recursive: true });
            // Save config with formatting
            const configContent = JSON.stringify(this.config, null, 2);
            await fs_1.promises.writeFile(this.configPath, configContent, "utf-8");
        }
        catch (error) {
            throw new Error(`Failed to save configuration: ${error}`);
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        this.config = this.deepMerge(this.config, updates);
    }
    getDbPath() {
        return this.config.dbPath;
    }
    getLogLevel() {
        return this.config.logLevel;
    }
    getMaxTokenBatchSize() {
        return this.config.maxTokenBatchSize;
    }
    getCostForModel(model, inputTokens, outputTokens) {
        const modelConfig = this.config.costModel.modelSpecific[model];
        const inputCost = (inputTokens / 1000) * (modelConfig?.inputCostPer1k || this.config.costModel.inputCostPer1k);
        const outputCost = (outputTokens / 1000) * (modelConfig?.outputCostPer1k || this.config.costModel.outputCostPer1k);
        return inputCost + outputCost;
    }
    getMcpConfig() {
        return { ...this.config.mcp };
    }
    getTrackingConfig() {
        return { ...this.config.tracking };
    }
    getAlertsConfig() {
        return { ...this.config.alerts };
    }
    validateConfig() {
        const errors = [];
        // Validate database path
        if (!this.config.dbPath || typeof this.config.dbPath !== "string") {
            errors.push("Database path is required");
        }
        // Validate log level
        const validLogLevels = ["debug", "info", "warn", "error"];
        if (!validLogLevels.includes(this.config.logLevel)) {
            errors.push(`Invalid log level: ${this.config.logLevel}`);
        }
        // Validate cost model
        if (this.config.costModel.inputCostPer1k < 0 || this.config.costModel.outputCostPer1k < 0) {
            errors.push("Cost values cannot be negative");
        }
        // Validate retention days
        if (this.config.tracking.retentionDays < 1 || this.config.tracking.retentionDays > 365) {
            errors.push("Retention days must be between 1 and 365");
        }
        // Validate thresholds
        if (this.config.alerts.costThreshold < 0 || this.config.alerts.tokenThreshold < 0) {
            errors.push("Alert thresholds cannot be negative");
        }
        // Validate MCP port
        if (this.config.mcp.port < 1 || this.config.mcp.port > 65535) {
            errors.push("MCP port must be between 1 and 65535");
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    applyEnvironmentOverrides() {
        // Environment variable overrides
        const overrides = {
            ACO_DB_PATH: "dbPath",
            ACO_LOG_LEVEL: "logLevel",
            ACO_MAX_TOKEN_BATCH_SIZE: "maxTokenBatchSize",
            ACO_COST_ALERTS_ENABLED: "alerts.enableCostAlerts",
            ACO_COST_THRESHOLD: "alerts.costThreshold",
            ACP_MCP_PORT: "mcp.port",
            ACO_MCP_HOST: "mcp.host",
        };
        Object.entries(overrides).forEach(([envVar, configPath]) => {
            const value = process.env[envVar];
            if (value !== undefined) {
                this.setNestedValue(configPath, this.parseEnvValue(value));
            }
        });
    }
    setNestedValue(path, value) {
        const keys = path.split(".");
        let current = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
    }
    parseEnvValue(value) {
        // Try to parse as JSON first
        try {
            return JSON.parse(value);
        }
        catch {
            // Return as string if JSON parsing fails
            return value;
        }
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === "object" &&
                    source[key] !== null &&
                    !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    // Helper method to generate configuration example
    generateConfigExample() {
        return `
# Agent Cost Observatory Configuration
# Copy this to ~/.aco/config.json and customize as needed

{
  "dbPath": "~/.aco/usage.db",
  "logLevel": "info",
  "maxTokenBatchSize": 1000,
  "costModel": {
    "inputCostPer1k": 0.002,
    "outputCostPer1k": 0.002,
    "modelSpecific": {
      "gpt-3.5-turbo": {
        "inputCostPer1k": 0.0015,
        "outputCostPer1k": 0.002
      },
      "gpt-4": {
        "inputCostPer1k": 0.03,
        "outputCostPer1k": 0.06
      },
      "claude-3-haiku": {
        "inputCostPer1k": 0.0025,
        "outputCostPer1k": 0.0125
      }
    }
  },
  "tracking": {
    "enableDetailedTracking": true,
    "trackErrorDetails": true,
    "retentionDays": 90
  },
  "alerts": {
    "enableCostAlerts": true,
    "costThreshold": 10.0,
    "tokenThreshold": 1000000
  },
  "mcp": {
    "port": 3001,
    "host": "localhost",
    "enableHttp": false,
    "corsOrigins": ["http://localhost:3000"]
  }
}
`;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map