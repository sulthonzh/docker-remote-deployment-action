"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCommand = void 0;
const commander_1 = require("commander");
const logger_1 = require("../utils/logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
class AgentCommand {
    orchestrator;
    logger;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = new logger_1.Logger('info');
    }
    registerCommands(program) {
        program
            .command('agent')
            .description('Agent management commands')
            .addCommand(this.createAgentListCommand())
            .addCommand(this.createAgentCreateCommand())
            .addCommand(this.createAgentUpdateCommand())
            .addCommand(this.createAgentDeleteCommand())
            .addCommand(this.createAgentShowCommand())
            .addCommand(this.createAgentTestCommand());
    }
    createAgentListCommand() {
        return new commander_1.Command('list')
            .description('List all agents')
            .option('--json', 'Output in JSON format')
            .option('--enabled', 'Show only enabled agents')
            .option('--disabled', 'Show only disabled agents')
            .option('--type <type>', 'Filter by agent type (openai, claude, local, custom)')
            .action(async (options) => {
            try {
                const agents = await this.orchestrator['agentExecutor'].listAgents();
                let filteredAgents = agents;
                if (options.enabled) {
                    filteredAgents = agents.filter(agent => agent.enabled);
                }
                else if (options.disabled) {
                    filteredAgents = agents.filter(agent => !agent.enabled);
                }
                if (options.type) {
                    filteredAgents = filteredAgents.filter(agent => agent.type === options.type);
                }
                if (options.json) {
                    console.log(JSON.stringify(filteredAgents, null, 2));
                }
                else {
                    console.log('Agents:');
                    filteredAgents.forEach(agent => {
                        const status = agent.enabled ? '✅' : '❌';
                        console.log(`  ${status} ${agent.id} - ${agent.name} (${agent.type})`);
                        console.log(`    Model: ${agent.model}`);
                        console.log(`    Capabilities: ${agent.capabilities.join(', ')}`);
                        console.log(`    Timeout: ${agent.timeout}ms`);
                        console.log('');
                    });
                }
            }
            catch (error) {
                this.logger.error('Failed to list agents:', error);
                process.exit(1);
            }
        });
    }
    createAgentCreateCommand() {
        return new commander_1.Command('create')
            .description('Create a new agent')
            .option('-i, --id <id>', 'Agent ID')
            .option('-n, --name <name>', 'Agent name')
            .option('-t, --type <type>', 'Agent type (openai, claude, local, custom)')
            .option('-m, --model <model>', 'Model name')
            .option('-e, --endpoint <endpoint>', 'API endpoint')
            .option('--capabilities <capabilities>', 'Comma-separated capabilities')
            .option('--timeout <timeout>', 'Timeout in milliseconds', parseInt)
            .option('--max-tokens <maxTokens>', 'Maximum tokens', parseInt)
            .option('--temperature <temperature>', 'Temperature', parseFloat)
            .option('--api-key <apiKey>', 'API key')
            .option('--file <file>', 'Agent configuration file')
            .option('--enabled', 'Enable agent', true)
            .action(async (options) => {
            try {
                let agentConfig;
                if (options.file) {
                    // Load from file
                    const agentData = await fs_extra_1.default.readJSON(options.file);
                    agentConfig = this.parseAgentFromData(agentData);
                }
                else {
                    // Create from options
                    agentConfig = {
                        id: options.id || this.generateAgentId(),
                        name: options.name || 'New Agent',
                        type: options.type || 'openai',
                        model: options.model || 'gpt-3.5-turbo',
                        endpoint: options.endpoint,
                        parameters: {},
                        capabilities: options.capabilities ? options.capabilities.split(',').map((c) => c.trim()) : [],
                        maxTokens: options.maxTokens,
                        temperature: options.temperature,
                        timeout: options.timeout,
                        enabled: options.enabled
                    };
                    // Add API key if provided
                    if (options.apiKey) {
                        agentConfig.parameters.apiKey = options.apiKey;
                    }
                }
                await this.orchestrator['agentExecutor'].addAgent(agentConfig);
                console.log(`Agent created successfully: ${agentConfig.name} (${agentConfig.id})`);
            }
            catch (error) {
                this.logger.error('Failed to create agent:', error);
                process.exit(1);
            }
        });
    }
    createAgentUpdateCommand() {
        return new commander_1.Command('update')
            .description('Update an existing agent')
            .requiredOption('-i, --id <id>', 'Agent ID')
            .option('-n, --name <name>', 'Agent name')
            .option('-t, --type <type>', 'Agent type (openai, claude, local, custom)')
            .option('-m, --model <model>', 'Model name')
            .option('-e, --endpoint <endpoint>', 'API endpoint')
            .option('--capabilities <capabilities>', 'Comma-separated capabilities')
            .option('--timeout <timeout>', 'Timeout in milliseconds', parseInt)
            .option('--max-tokens <maxTokens>', 'Maximum tokens', parseInt)
            .option('--temperature <temperature>', 'Temperature', parseFloat)
            .option('--api-key <apiKey>', 'API key')
            .option('--enabled', 'Enable agent')
            .option('--disabled', 'Disable agent')
            .option('--file <file>', 'Agent configuration file')
            .action(async (options) => {
            try {
                const updates = {};
                if (options.name)
                    updates.name = options.name;
                if (options.type)
                    updates.type = options.type;
                if (options.model)
                    updates.model = options.model;
                if (options.endpoint)
                    updates.endpoint = options.endpoint;
                if (options.capabilities)
                    updates.capabilities = options.capabilities.split(',').map((c) => c.trim());
                if (options.timeout)
                    updates.timeout = options.timeout;
                if (options.maxTokens)
                    updates.maxTokens = options.maxTokens;
                if (options.temperature)
                    updates.temperature = options.temperature;
                if (options.enabled !== undefined)
                    updates.enabled = options.enabled;
                if (options.disabled !== undefined)
                    updates.enabled = !options.disabled;
                // Handle API key update
                if (options.apiKey) {
                    if (!updates.parameters)
                        updates.parameters = {};
                    updates.parameters.apiKey = options.apiKey;
                }
                if (options.file) {
                    const agentData = await fs_extra_1.default.readJSON(options.file);
                    const agentConfig = this.parseAgentFromData(agentData);
                    Object.assign(updates, agentConfig);
                }
                await this.orchestrator['agentExecutor'].updateAgent(options.id, updates);
                console.log(`Agent updated successfully: ${options.id}`);
            }
            catch (error) {
                this.logger.error('Failed to update agent:', error);
                process.exit(1);
            }
        });
    }
    createAgentDeleteCommand() {
        return new commander_1.Command('delete')
            .description('Delete an agent')
            .requiredOption('-i, --id <id>', 'Agent ID')
            .option('-f, --force', 'Force deletion without confirmation')
            .action(async (options) => {
            try {
                if (!options.force) {
                    const confirmation = await this.promptConfirmation(`Are you sure you want to delete agent ${options.id}?`);
                    if (!confirmation) {
                        console.log('Deletion cancelled.');
                        return;
                    }
                }
                await this.orchestrator['agentExecutor'].removeAgent(options.id);
                console.log(`Agent deleted successfully: ${options.id}`);
            }
            catch (error) {
                this.logger.error('Failed to delete agent:', error);
                process.exit(1);
            }
        });
    }
    createAgentShowCommand() {
        return new commander_1.Command('show')
            .description('Show agent details')
            .requiredOption('-i, --id <id>', 'Agent ID')
            .option('--json', 'Output in JSON format')
            .action(async (options) => {
            try {
                const agent = await this.orchestrator['agentExecutor'].getAgent(options.id);
                if (!agent) {
                    console.log(`Agent not found: ${options.id}`);
                    return;
                }
                if (options.json) {
                    console.log(JSON.stringify(agent, null, 2));
                }
                else {
                    console.log(`Agent: ${agent.name} (${agent.id})`);
                    console.log(`Type: ${agent.type}`);
                    console.log(`Model: ${agent.model}`);
                    console.log(`Endpoint: ${agent.endpoint || 'Default'}`);
                    console.log(`Status: ${agent.enabled ? 'Enabled' : 'Disabled'}`);
                    console.log(`Capabilities: ${agent.capabilities.join(', ')}`);
                    console.log(`Timeout: ${agent.timeout}ms`);
                    console.log(`Max Tokens: ${agent.maxTokens}`);
                    console.log(`Temperature: ${agent.temperature}`);
                    console.log(`Parameters: ${JSON.stringify(agent.parameters, null, 2)}`);
                }
            }
            catch (error) {
                this.logger.error('Failed to show agent:', error);
                process.exit(1);
            }
        });
    }
    createAgentTestCommand() {
        return new commander_1.Command('test')
            .description('Test an agent with a sample prompt')
            .requiredOption('-i, --id <id>', 'Agent ID')
            .option('-p, --prompt <prompt>', 'Test prompt', 'Hello! Can you introduce yourself?')
            .option('--json', 'Output in JSON format')
            .option('--timeout <timeout>', 'Test timeout in milliseconds', '30000')
            .action(async (options) => {
            try {
                const agent = await this.orchestrator['agentExecutor'].getAgent(options.id);
                if (!agent) {
                    console.log(`Agent not found: ${options.id}`);
                    return;
                }
                console.log(`Testing agent: ${agent.name} (${agent.id})`);
                console.log(`Prompt: ${options.prompt}`);
                const startTime = Date.now();
                const result = await this.orchestrator['agentExecutor'].executeAgent(agent, {
                    prompt: options.prompt
                });
                const endTime = Date.now();
                if (options.json) {
                    console.log(JSON.stringify({
                        agent: agent.name,
                        duration: endTime - startTime,
                        result
                    }, null, 2));
                }
                else {
                    console.log(`Duration: ${endTime - startTime}ms`);
                    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
                    if (result.success) {
                        console.log(`Response: ${result.data?.content || result.data?.response || 'No response'}`);
                    }
                    else {
                        console.log(`Error: ${result.error}`);
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to test agent:', error);
                process.exit(1);
            }
        });
    }
    parseAgentFromData(data) {
        return {
            id: data.id,
            name: data.name,
            type: data.type,
            endpoint: data.endpoint,
            model: data.model,
            parameters: data.parameters || {},
            capabilities: data.capabilities || [],
            maxTokens: data.maxTokens,
            temperature: data.temperature,
            timeout: data.timeout,
            enabled: data.enabled !== false
        };
    }
    generateAgentId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `agent-${timestamp}-${random}`;
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
exports.AgentCommand = AgentCommand;
//# sourceMappingURL=agent-command.js.map