import fs from 'fs/promises';
import availableProbes from '../probes';
import { Logger } from '../utils/logger';
export class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.logger = new Logger();
    }
    async load() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf-8');
            const config = JSON.parse(configData);
            // Validate the config
            this.validateConfig(config);
            return config;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }
            throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async generateDefault() {
        const defaultConfig = {
            version: '1.0.0',
            metadata: {
                generated: new Date().toISOString(),
                description: 'Default agent sandbox probe configuration'
            },
            agents: {
                'claude-code': {
                    name: 'Claude Code',
                    endpoints: ['https://claude-code.example.com'],
                    capabilities: ['file-read', 'file-write', 'network', 'process']
                },
                'codex': {
                    name: 'GitHub Copilot Codex',
                    endpoints: ['https://api.githubcopilot.com'],
                    capabilities: ['file-read', 'file-write', 'network']
                }
            },
            sandboxes: {
                'enclave': {
                    name: 'Enclave Sandbox',
                    isolation: true,
                    allowedPaths: ['/workspace'],
                    blockedPaths: ['/etc', '/usr/local'],
                    blockedNetwork: ['127.0.0.1:22', '192.168.0.0/16'],
                    restrictedCapabilities: ['root', 'network-bind']
                },
                'claude-sandbox': {
                    name: 'Claude Sandbox',
                    isolation: true,
                    allowedPaths: ['/app'],
                    blockedPaths: ['/system', '/host'],
                    blockedNetwork: ['localhost:443'],
                    restrictedCapabilities: ['exec', 'net-bind']
                }
            },
            probes: availableProbes,
            settings: {
                timeout: 30000,
                retries: 2,
                parallel: 1,
                strict: true
            }
        };
        // Use serialized probe objects for config
        const defaultConfigWithProbes = {
            ...defaultConfig,
            probes: availableProbes.map(probe => ({
                id: probe.id,
                name: probe.name,
                category: probe.category,
                severity: probe.severity,
                description: probe.description,
                setup: probe.setup,
                expectedResult: probe.expectedResult
            }))
        };
        const configData = JSON.stringify(defaultConfigWithProbes, null, 2);
        return fs.writeFile(this.configPath, configData)
            .then(() => {
            this.logger.info(`Default configuration generated at: ${this.configPath}`);
        })
            .catch((error) => {
            throw new Error(`Failed to generate configuration: ${error instanceof Error ? error.message : String(error)}`);
        });
    }
    validateConfig(config) {
        if (!config.agents || Object.keys(config.agents).length === 0) {
            throw new Error('Configuration must include at least one agent');
        }
        if (!config.sandboxes || Object.keys(config.sandboxes).length === 0) {
            throw new Error('Configuration must include at least one sandbox');
        }
        if (!config.probes || config.probes.length === 0) {
            throw new Error('Configuration must include at least one probe');
        }
        // Validate probe structure
        for (const probe of config.probes) {
            if (!probe.id || !probe.name || !probe.category) {
                throw new Error(`Probe missing required fields: ${JSON.stringify(probe)}`);
            }
        }
    }
}
//# sourceMappingURL=config-manager.js.map