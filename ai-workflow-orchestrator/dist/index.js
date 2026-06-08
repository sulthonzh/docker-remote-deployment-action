#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const orchestrator_1 = require("./core/orchestrator");
const logger_1 = require("./utils/logger");
const workflow_builder_1 = require("./commands/workflow-builder");
const agent_command_1 = require("./commands/agent-command");
const execution_command_1 = require("./commands/execution-command");
const config_command_1 = require("./commands/config-command");
const program = new commander_1.Command();
const logger = new logger_1.Logger('info');
program
    .name('ai-orchestrator')
    .description('AI Workflow Orchestrator - Intelligent workflow orchestration for multi-agent AI systems')
    .version('1.0.0');
// Load configuration
let config;
try {
    // Try to load config from file
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'ai-workflow-config.json');
    if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = configData;
    }
    else {
        // Use default configuration
        config = getDefaultConfig();
    }
}
catch (error) {
    logger.warn('Could not load configuration file, using defaults');
    config = getDefaultConfig();
}
// Initialize orchestrator
const orchestrator = orchestrator_1.WorkflowOrchestrator.create({
    type: config.storage.type,
    config: config.storage.config || {}
});
// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', reason, 'Promise:', promise);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
// Main commands
program
    .command('start')
    .description('Start the AI Workflow Orchestrator')
    .option('-d, --daemon', 'Run as daemon')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .action(async (options) => {
    try {
        await orchestrator.start();
        if (options.daemon) {
            logger.info('AI Workflow Orchestrator running as daemon');
            // Keep the process alive
            setInterval(() => {
                logger.debug('Heartbeat - Orchestrator is running');
            }, 30000);
        }
        else {
            logger.info('AI Workflow Orchestrator started successfully');
            console.log('AI Workflow Orchestrator is running. Press Ctrl+C to stop.');
            // Set up graceful shutdown
            process.on('SIGINT', async () => {
                logger.info('Received SIGINT, shutting down gracefully...');
                await orchestrator.stop();
                process.exit(0);
            });
            process.on('SIGTERM', async () => {
                logger.info('Received SIGTERM, shutting down gracefully...');
                await orchestrator.stop();
                process.exit(0);
            });
        }
    }
    catch (error) {
        logger.error('Failed to start orchestrator:', error);
        process.exit(1);
    }
});
program
    .command('stop')
    .description('Stop the AI Workflow Orchestrator')
    .action(async () => {
    try {
        await orchestrator.stop();
        logger.info('AI Workflow Orchestrator stopped successfully');
    }
    catch (error) {
        logger.error('Failed to stop orchestrator:', error);
        process.exit(1);
    }
});
// Workflow commands
const workflowBuilder = new workflow_builder_1.WorkflowBuilder(orchestrator);
workflowBuilder.registerCommands(program);
// Agent commands
const agentCommand = new agent_command_1.AgentCommand(orchestrator);
agentCommand.registerCommands(program);
// Execution commands
const executionCommand = new execution_command_1.ExecutionCommand(orchestrator);
executionCommand.registerCommands(program);
// Config commands
const configCommand = new config_command_1.ConfigCommand(orchestrator);
configCommand.registerCommands(program);
// Status command
program
    .command('status')
    .description('Show orchestrator status')
    .action(async () => {
    try {
        const isRunning = orchestrator.isRunningStatus();
        console.log('Status:', isRunning ? 'Running' : 'Stopped');
        if (isRunning) {
            const workflows = await orchestrator.listWorkflows();
            console.log(`Workflows loaded: ${workflows.length}`);
            const stats = await orchestrator.getStats();
            console.log(`Total executions: ${stats.totalExecutions}`);
            console.log(`Active executions: ${stats.activeExecutions}`);
            console.log(`Completed executions: ${stats.completedExecutions}`);
            console.log(`Failed executions: ${stats.failedExecutions}`);
            console.log(`Average duration: ${stats.averageDuration}ms`);
        }
    }
    catch (error) {
        logger.error('Failed to get status:', error);
        process.exit(1);
    }
});
// Help command
program
    .command('help')
    .description('Show help information')
    .action(() => {
    program.outputHelp();
});
// Parse command line arguments
program.parse();
function getDefaultConfig() {
    return {
        workflows: [
            {
                id: 'example-workflow',
                name: 'Example AI Workflow',
                description: 'A sample workflow demonstrating AI agent orchestration',
                version: '1.0.0',
                entryPoint: 'start',
                steps: {
                    start: {
                        id: 'start',
                        name: 'Start Workflow',
                        type: 'agent',
                        agent: {
                            id: 'openai-assistant',
                            name: 'OpenAI Assistant',
                            type: 'openai',
                            model: 'gpt-3.5-turbo',
                            parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                            capabilities: ['text-generation', 'conversation'],
                            enabled: true
                        },
                        parameters: { prompt: 'Hello! Start the workflow by greeting the user.' }
                    }
                },
                state: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ],
        agents: [
            {
                id: 'openai-assistant',
                name: 'OpenAI Assistant',
                type: 'openai',
                model: 'gpt-3.5-turbo',
                parameters: {
                    apiKey: process.env.OPENAI_API_KEY || '',
                    temperature: 0.7,
                    maxTokens: 1000
                },
                capabilities: ['text-generation', 'conversation'],
                enabled: true
            }
        ],
        storage: {
            type: 'memory',
            config: {}
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
//# sourceMappingURL=index.js.map