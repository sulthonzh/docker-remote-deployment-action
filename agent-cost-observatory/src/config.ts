import { promises as fs } from "fs";
import path from "path";

export interface Config {
  dbPath: string;
  logLevel: "debug" | "info" | "warn" | "error";
  maxTokenBatchSize: number;
  costModel: {
    inputCostPer1k: number;
    outputCostPer1k: number;
    modelSpecific: Record<string, { inputCostPer1k: number; outputCostPer1k: number }>;
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

export const defaultConfig: Config = {
  dbPath: path.join(process.cwd(), "usage.db"),
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

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || path.join(process.env.HOME || "", ".aco", "config.json");
    this.config = { ...defaultConfig };
  }

  async initialize(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Check if config file exists
      try {
        await fs.access(this.configPath);
        // Load existing config
        await this.loadConfig();
      } catch {
        // Create default config
        await this.saveConfig();
      }

      // Apply environment variable overrides
      this.applyEnvironmentOverrides();
    } catch (error) {
      throw new Error(`Failed to initialize configuration: ${error}`);
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.configPath, "utf-8");
      const loadedConfig = JSON.parse(configContent);
      
      // Deep merge with defaults
      this.config = this.deepMerge(defaultConfig, loadedConfig);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Save config with formatting
      const configContent = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configContent, "utf-8");
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = this.deepMerge(this.config, updates);
  }

  getDbPath(): string {
    return this.config.dbPath;
  }

  getLogLevel(): Config["logLevel"] {
    return this.config.logLevel;
  }

  getMaxTokenBatchSize(): number {
    return this.config.maxTokenBatchSize;
  }

  getCostForModel(model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = this.config.costModel.modelSpecific[model];
    const inputCost = (inputTokens / 1000) * (modelConfig?.inputCostPer1k || this.config.costModel.inputCostPer1k);
    const outputCost = (outputTokens / 1000) * (modelConfig?.outputCostPer1k || this.config.costModel.outputCostPer1k);
    
    return inputCost + outputCost;
  }

  getMcpConfig(): Config["mcp"] {
    return { ...this.config.mcp };
  }

  getTrackingConfig(): Config["tracking"] {
    return { ...this.config.tracking };
  }

  getAlertsConfig(): Config["alerts"] {
    return { ...this.config.alerts };
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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

  private applyEnvironmentOverrides(): void {
    // Environment variable overrides
    const overrides: Record<string, string> = {
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

  private setNestedValue(path: string, value: any): void {
    const keys = path.split(".");
    let current: any = this.config;

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

  private parseEnvValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Return as string if JSON parsing fails
      return value;
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === "object" &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  // Helper method to generate configuration example
  generateConfigExample(): string {
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