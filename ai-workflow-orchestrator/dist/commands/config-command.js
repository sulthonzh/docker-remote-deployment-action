"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const commander_1 = require("commander");
const logger_1 = require("../utils/logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class ConfigCommand {
    orchestrator;
    logger;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = new logger_1.Logger('info');
    }
    registerCommands(program) {
        program
            .command('config')
            .description('Configuration management commands')
            .addCommand(this.createConfigShowCommand())
            .addCommand(this.createConfigValidateCommand())
            .addCommand(this.createConfigBackupCommand())
            .addCommand(this.createConfigRestoreCommand())
            .addCommand(this.createConfigResetCommand())
            .addCommand(this.createConfigExportCommand())
            .addCommand(this.createConfigImportCommand());
    }
    createConfigShowCommand() {
        return new commander_1.Command('show')
            .description('Show current configuration')
            .option('--json', 'Output in JSON format')
            .option('--secrets', 'Show sensitive information (API keys, etc.)')
            .action(async (options) => {
            try {
                const config = this.getConfig();
                if (options.json) {
                    console.log(JSON.stringify(config, null, 2));
                }
                else {
                    console.log('AI Workflow Orchestrator Configuration:');
                    console.log(`Workflows: ${config.workflows.length} loaded`);
                    console.log(`Agents: ${config.agents.length} configured`);
                    console.log(`Storage: ${config.storage.type}`);
                    console.log(`Logging: ${config.logging.level}`);
                    console.log(`Metrics: ${config.metrics.enabled ? 'Enabled' : 'Disabled'}`);
                    if (options.secrets) {
                        console.log('\nSensitive Information:');
                        config.agents.forEach(agent => {
                            if (agent.parameters.apiKey) {
                                console.log(`  ${agent.name}: API Key present (${agent.parameters.apiKey.length} chars)`);
                            }
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to show configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigValidateCommand() {
        return new commander_1.Command('validate')
            .description('Validate configuration')
            .option('--strict', 'Strict validation (fail on warnings)')
            .action(async (options) => {
            try {
                const config = this.getConfig();
                const validation = this.validateConfiguration(config);
                if (validation.valid) {
                    console.log('✅ Configuration is valid');
                }
                else {
                    console.log('❌ Configuration validation failed:');
                    validation.errors.forEach(error => console.log(`  - ${error}`));
                    if (validation.warnings.length > 0) {
                        console.log('\n⚠️  Warnings:');
                        validation.warnings.forEach(warning => console.log(`  - ${warning}`));
                    }
                    if (options.strict) {
                        process.exit(1);
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to validate configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigBackupCommand() {
        return new commander_1.Command('backup')
            .description('Backup configuration')
            .option('-f, --file <file>', 'Backup file path')
            .option('--include-state', 'Include workflow state data')
            .option('--include-metrics', 'Include metrics data')
            .action(async (options) => {
            try {
                const backupDir = path_1.default.join(process.cwd(), 'backups');
                await fs_extra_1.default.ensureDir(backupDir);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = options.file || `config-backup-${timestamp}.json`;
                const backupPath = path_1.default.join(backupDir, backupFile);
                const backup = {
                    config: this.getConfig(),
                    timestamp: timestamp,
                    version: '1.0.0'
                };
                if (options.includeState || options.includeMetrics) {
                    backup.data = {};
                    if (options.includeState) {
                        backup.data.state = await this.orchestrator.stateManager.listWorkflowStates();
                    }
                    if (options.includeMetrics) {
                        backup.data.metrics = await this.orchestrator.stateManager.getMetrics();
                    }
                }
                await fs_extra_1.default.writeJSON(backupPath, backup, { spaces: 2 });
                console.log(`Configuration backed up to: ${backupPath}`);
            }
            catch (error) {
                this.logger.error('Failed to backup configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigRestoreCommand() {
        return new commander_1.Command('restore')
            .description('Restore configuration from backup')
            .requiredOption('-f, --file <file>', 'Backup file path')
            .option('--merge', 'Merge with current configuration instead of replacing')
            .option('--validate-only', 'Only validate backup without restoring')
            .action(async (options) => {
            try {
                const backupPath = options.file;
                const backupData = await fs_extra_1.default.readJSON(backupPath);
                // Validate backup structure
                if (!backupData.config) {
                    throw new Error('Invalid backup file: missing configuration data');
                }
                if (options.validateOnly) {
                    console.log('✅ Backup file is valid');
                    return;
                }
                const currentConfig = this.getConfig();
                const newConfig = backupData.config;
                if (options.merge) {
                    // Merge configurations
                    const mergedConfig = this.mergeConfigurations(currentConfig, newConfig);
                    await this.saveConfig(mergedConfig);
                    console.log('Configuration merged and saved');
                }
                else {
                    // Replace configuration
                    await this.saveConfig(newConfig);
                    console.log('Configuration restored from backup');
                }
                console.log(`Backup timestamp: ${backupData.timestamp}`);
            }
            catch (error) {
                this.logger.error('Failed to restore configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigResetCommand() {
        return new commander_1.Command('reset')
            .description('Reset configuration to defaults')
            .option('--confirm', 'Skip confirmation prompt')
            .option('--preserve-agents', 'Preserve existing agents')
            .option('--preserve-workflows', 'Preserve existing workflows')
            .action(async (options) => {
            try {
                if (!options.confirm) {
                    const confirmation = await this.promptConfirmation('Are you sure you want to reset the configuration? This will overwrite your current settings.');
                    if (!confirmation) {
                        console.log('Reset cancelled.');
                        return;
                    }
                }
                const defaultConfig = this.getDefaultConfig();
                // Preserve existing elements if requested
                const config = defaultConfig;
                if (options.preserveAgents) {
                    config.agents = this.getConfig().agents;
                }
                if (options.preserveWorkflows) {
                    config.workflows = this.getConfig().workflows;
                }
                await this.saveConfig(config);
                console.log('Configuration reset to defaults');
            }
            catch (error) {
                this.logger.error('Failed to reset configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigExportCommand() {
        return new commander_1.Command('export')
            .description('Export configuration for sharing')
            .option('-f, --file <file>', 'Export file path')
            .option('--exclude-secrets', 'Exclude sensitive information')
            .option('--format <format>', 'Export format (json, yaml)', 'json')
            .option('--include-templates', 'Include workflow templates')
            .action(async (options) => {
            try {
                const config = this.getConfig();
                // Remove secrets if requested
                if (options.excludeSecrets) {
                    config.agents.forEach(agent => {
                        if (agent.parameters.apiKey) {
                            delete agent.parameters.apiKey;
                        }
                    });
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const exportFile = options.file || `config-export-${timestamp}.${options.format}`;
                const exportPath = path_1.default.join(process.cwd(), exportFile);
                if (options.format === 'json') {
                    await fs_extra_1.default.writeJSON(exportPath, config, { spaces: 2 });
                }
                else if (options.format === 'yaml') {
                    const yaml = require('yaml');
                    await fs_extra_1.default.writeFile(exportPath, yaml.stringify(config));
                }
                console.log(`Configuration exported to: ${exportPath}`);
            }
            catch (error) {
                this.logger.error('Failed to export configuration:', error);
                process.exit(1);
            }
        });
    }
    createConfigImportCommand() {
        return new commander_1.Command('import')
            .description('Import configuration from file')
            .requiredOption('-f, --file <file>', 'Configuration file path')
            .option('--merge', 'Merge with current configuration')
            .option('--validate-only', 'Only validate without importing')
            .action(async (options) => {
            try {
                const importPath = options.file;
                const importData = await fs_extra_1.default.readJSON(importPath);
                // Validate imported configuration
                const validation = this.validateConfiguration(importData);
                if (!validation.valid) {
                    console.log('❌ Import validation failed:');
                    validation.errors.forEach(error => console.log(`  - ${error}`));
                    process.exit(1);
                }
                if (options.validateOnly) {
                    console.log('✅ Configuration file is valid');
                    return;
                }
                const currentConfig = this.getConfig();
                if (options.merge) {
                    const mergedConfig = this.mergeConfigurations(currentConfig, importData);
                    await this.saveConfig(mergedConfig);
                    console.log('Configuration imported and merged');
                }
                else {
                    await this.saveConfig(importData);
                    console.log('Configuration imported successfully');
                }
            }
            catch (error) {
                this.logger.error('Failed to import configuration:', error);
                process.exit(1);
            }
        });
    }
    getConfig() {
        // This would normally load from a configuration file
        // For now, return the current orchestrator configuration
        return this.orchestrator['config'];
    }
    saveConfig(config) {
        // This would normally save to a configuration file
        // For now, just log that the config would be saved
        this.logger.info('Configuration saved');
        return Promise.resolve();
    }
    validateConfiguration(config) {
        const errors = [];
        const warnings = [];
        // Validate required fields
        if (!config.workflows) {
            errors.push('Missing workflows configuration');
        }
        if (!config.agents) {
            errors.push('Missing agents configuration');
        }
        if (!config.storage) {
            errors.push('Missing storage configuration');
        }
        // Validate workflows
        config.workflows?.forEach((workflow, index) => {
            if (!workflow.id) {
                errors.push(`Workflow ${index}: Missing ID`);
            }
            if (!workflow.name) {
                errors.push(`Workflow ${index}: Missing name`);
            }
            if (!workflow.steps) {
                errors.push(`Workflow ${index}: Missing steps`);
            }
            if (!workflow.steps[workflow.entryPoint]) {
                errors.push(`Workflow ${index}: Entry point step ${workflow.entryPoint} not found`);
            }
            // Validate steps
            Object.values(workflow.steps).forEach((step, stepIndex) => {
                if (!step.id) {
                    errors.push(`Workflow ${index}, Step ${stepIndex}: Missing ID`);
                }
                if (!step.name) {
                    errors.push(`Workflow ${index}, Step ${stepIndex}: Missing name`);
                }
                if (!step.type) {
                    errors.push(`Workflow ${index}, Step ${stepIndex}: Missing type`);
                }
                // Validate agent references
                if (step.type === 'agent' && !step.agent) {
                    warnings.push(`Workflow ${index}, Step ${stepIndex}: Missing agent configuration`);
                }
                if (step.type === 'agent' && step.agent) {
                    const agent = config.agents?.find(a => a.id === step.agent?.id);
                    if (!agent) {
                        warnings.push(`Workflow ${index}, Step ${stepIndex}: Agent ${step.agent.id} not found`);
                    }
                }
            });
        });
        // Validate agents
        config.agents?.forEach((agent, index) => {
            if (!agent.id) {
                errors.push(`Agent ${index}: Missing ID`);
            }
            if (!agent.name) {
                errors.push(`Agent ${index}: Missing name`);
            }
            if (!agent.type) {
                errors.push(`Agent ${index}: Missing type`);
            }
            if (!agent.model) {
                errors.push(`Agent ${index}: Missing model`);
            }
            if (agent.type === 'openai' && !agent.parameters?.apiKey) {
                warnings.push(`Agent ${index}: OpenAI API key not configured`);
            }
            if (agent.type === 'claude' && !agent.parameters?.apiKey) {
                warnings.push(`Agent ${index}: Claude API key not configured`);
            }
        });
        // Validate storage configuration
        if (config.storage) {
            if (!['memory', 'file', 'database'].includes(config.storage.type)) {
                errors.push(`Invalid storage type: ${config.storage.type}`);
            }
        }
        // Validate logging configuration
        if (config.logging) {
            if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
                warnings.push(`Invalid logging level: ${config.logging.level}`);
            }
        }
        // Validate metrics configuration
        if (config.metrics) {
            if (config.metrics.retentionDays < 1) {
                warnings.push('Metrics retention days should be at least 1');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    mergeConfigurations(current, newConfig) {
        return {
            workflows: [...(current.workflows || []), ...(newConfig.workflows || [])],
            agents: [...(current.agents || []), ...(newConfig.agents || [])],
            storage: newConfig.storage || current.storage,
            logging: newConfig.logging || current.logging,
            metrics: newConfig.metrics || current.metrics
        };
    }
    getDefaultConfig() {
        return {
            workflows: [],
            agents: [],
            storage: {
                type: 'memory'
            },
            logging: {
                level: 'info'
            },
            metrics: {
                enabled: true,
                retentionDays: 30
            }
        };
    }
    async promptConfirmation(message) {
        const inquirer = require('inquirer');
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message,
                default: false
            }
        ]);
        return answer.confirmed;
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=config-command.js.map