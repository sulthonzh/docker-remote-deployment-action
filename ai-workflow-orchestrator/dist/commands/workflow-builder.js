"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowBuilder = void 0;
const commander_1 = require("commander");
const logger_1 = require("../utils/logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
class WorkflowBuilder {
    orchestrator;
    logger;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = new logger_1.Logger('info');
    }
    registerCommands(program) {
        // Workflow commands
        program
            .command('workflow')
            .description('Workflow management commands')
            .addCommand(this.createWorkflowListCommand())
            .addCommand(this.createWorkflowCreateCommand())
            .addCommand(this.createWorkflowUpdateCommand())
            .addCommand(this.createWorkflowDeleteCommand())
            .addCommand(this.createWorkflowShowCommand())
            .addCommand(this.createWorkflowImportCommand())
            .addCommand(this.createWorkflowExportCommand());
    }
    createWorkflowListCommand() {
        return new commander_1.Command('list')
            .description('List all workflows')
            .option('--json', 'Output in JSON format')
            .action(async (options) => {
            try {
                const workflows = await this.orchestrator.listWorkflows();
                if (options.json) {
                    console.log(JSON.stringify(workflows, null, 2));
                }
                else {
                    console.log('Workflows:');
                    workflows.forEach(workflow => {
                        console.log(`  ${workflow.id} - ${workflow.name} (${workflow.state})`);
                        console.log(`    Description: ${workflow.description || 'No description'}`);
                        console.log(`    Steps: ${Object.keys(workflow.steps).length}`);
                        console.log(`    Version: ${workflow.version}`);
                        console.log(`    Updated: ${workflow.updatedAt.toISOString()}`);
                        console.log('');
                    });
                }
            }
            catch (error) {
                this.logger.error('Failed to list workflows:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowCreateCommand() {
        return new commander_1.Command('create')
            .description('Create a new workflow')
            .option('-f, --file <file>', 'Workflow file path')
            .option('-n, --name <name>', 'Workflow name')
            .option('-d, --description <description>', 'Workflow description')
            .option('-e, --entry <entry>', 'Entry point step ID')
            .option('-t, --template <template>', 'Template to use (basic, complex, custom)')
            .action(async (options) => {
            try {
                let workflow;
                if (options.file) {
                    // Load from file
                    const workflowData = await fs_extra_1.default.readJSON(options.file);
                    workflow = this.parseWorkflowFromData(workflowData);
                }
                else if (options.template) {
                    // Create from template
                    workflow = this.createWorkflowFromTemplate(options.template, {
                        name: options.name || 'New Workflow',
                        description: options.description || '',
                        entry: options.entry || 'start'
                    });
                }
                else {
                    // Interactive creation would go here
                    workflow = this.createWorkflowFromTemplate('basic', {
                        name: options.name || 'New Workflow',
                        description: options.description || '',
                        entry: options.entry || 'start'
                    });
                }
                await this.orchestrator.addWorkflow(workflow);
                console.log(`Workflow created successfully: ${workflow.name} (${workflow.id})`);
            }
            catch (error) {
                this.logger.error('Failed to create workflow:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowUpdateCommand() {
        return new commander_1.Command('update')
            .description('Update an existing workflow')
            .requiredOption('-i, --id <id>', 'Workflow ID')
            .option('-n, --name <name>', 'Workflow name')
            .option('-d, --description <description>', 'Workflow description')
            .option('-s, --state <state>', 'Workflow state (draft, active, paused, completed, failed)')
            .option('-f, --file <file>', 'Workflow file path')
            .action(async (options) => {
            try {
                const updates = {};
                if (options.name)
                    updates.name = options.name;
                if (options.description)
                    updates.description = options.description;
                if (options.state)
                    updates.state = options.state;
                if (options.file) {
                    const workflowData = await fs_extra_1.default.readJSON(options.file);
                    const workflow = this.parseWorkflowFromData(workflowData);
                    Object.assign(updates, {
                        steps: workflow.steps,
                        version: workflow.version,
                        updatedAt: new Date()
                    });
                }
                await this.orchestrator.updateWorkflow(options.id, updates);
                console.log(`Workflow updated successfully: ${options.id}`);
            }
            catch (error) {
                this.logger.error('Failed to update workflow:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowDeleteCommand() {
        return new commander_1.Command('delete')
            .description('Delete a workflow')
            .requiredOption('-i, --id <id>', 'Workflow ID')
            .option('-f, --force', 'Force deletion without confirmation')
            .action(async (options) => {
            try {
                if (!options.force) {
                    const confirmation = await this.promptConfirmation(`Are you sure you want to delete workflow ${options.id}?`);
                    if (!confirmation) {
                        console.log('Deletion cancelled.');
                        return;
                    }
                }
                await this.orchestrator.removeWorkflow(options.id);
                console.log(`Workflow deleted successfully: ${options.id}`);
            }
            catch (error) {
                this.logger.error('Failed to delete workflow:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowShowCommand() {
        return new commander_1.Command('show')
            .description('Show workflow details')
            .requiredOption('-i, --id <id>', 'Workflow ID')
            .option('--json', 'Output in JSON format')
            .option('--steps', 'Show step details')
            .action(async (options) => {
            try {
                const workflow = await this.orchestrator.getWorkflow(options.id);
                if (!workflow) {
                    console.log(`Workflow not found: ${options.id}`);
                    return;
                }
                if (options.json) {
                    console.log(JSON.stringify(workflow, null, 2));
                }
                else {
                    console.log(`Workflow: ${workflow.name} (${workflow.id})`);
                    console.log(`Description: ${workflow.description || 'No description'}`);
                    console.log(`Version: ${workflow.version}`);
                    console.log(`State: ${workflow.state}`);
                    console.log(`Entry Point: ${workflow.entryPoint}`);
                    console.log(`Steps: ${Object.keys(workflow.steps).length}`);
                    console.log(`Created: ${workflow.createdAt.toISOString()}`);
                    console.log(`Updated: ${workflow.updatedAt.toISOString()}`);
                    if (options.steps) {
                        console.log('\nSteps:');
                        Object.entries(workflow.steps).forEach(([stepId, step]) => {
                            console.log(`  ${stepId}: ${step.name} (${step.type})`);
                            if (step.parameters) {
                                console.log(`    Parameters: ${JSON.stringify(step.parameters, null, 2)}`);
                            }
                            if (step.dependencies) {
                                console.log(`    Dependencies: ${step.dependencies.join(', ')}`);
                            }
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to show workflow:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowImportCommand() {
        return new commander_1.Command('import')
            .description('Import workflow from file')
            .requiredOption('-f, --file <file>', 'Workflow file path')
            .option('-i, --id <id>', 'Override workflow ID')
            .option('-n, --name <name>', 'Override workflow name')
            .action(async (options) => {
            try {
                const workflowData = await fs_extra_1.default.readJSON(options.file);
                let workflow = this.parseWorkflowFromData(workflowData);
                if (options.id)
                    workflow.id = options.id;
                if (options.name)
                    workflow.name = options.name;
                await this.orchestrator.addWorkflow(workflow);
                console.log(`Workflow imported successfully: ${workflow.name} (${workflow.id})`);
            }
            catch (error) {
                this.logger.error('Failed to import workflow:', error);
                process.exit(1);
            }
        });
    }
    createWorkflowExportCommand() {
        return new commander_1.Command('export')
            .description('Export workflow to file')
            .requiredOption('-i, --id <id>', 'Workflow ID')
            .option('-f, --file <file>', 'Output file path')
            .option('--format <format>', 'Output format (json, yaml)', 'json')
            .action(async (options) => {
            try {
                const workflow = await this.orchestrator.getWorkflow(options.id);
                if (!workflow) {
                    console.log(`Workflow not found: ${options.id}`);
                    return;
                }
                const outputPath = options.file || `${workflow.id}.${options.format}`;
                if (options.format === 'json') {
                    await fs_extra_1.default.writeJSON(outputPath, workflow, { spaces: 2 });
                }
                else if (options.format === 'yaml') {
                    const yaml = require('yaml');
                    await fs_extra_1.default.writeFile(outputPath, yaml.stringify(workflow));
                }
                console.log(`Workflow exported successfully: ${outputPath}`);
            }
            catch (error) {
                this.logger.error('Failed to export workflow:', error);
                process.exit(1);
            }
        });
    }
    parseWorkflowFromData(data) {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            version: data.version || '1.0.0',
            entryPoint: data.entryPoint,
            steps: data.steps,
            state: data.state || 'draft',
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            metadata: data.metadata
        };
    }
    createWorkflowFromTemplate(template, options) {
        const now = new Date();
        const workflowId = `${template.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        switch (template) {
            case 'basic':
                return {
                    id: workflowId,
                    name: options.name,
                    description: options.description,
                    version: '1.0.0',
                    entryPoint: options.entry,
                    steps: {
                        [options.entry]: {
                            id: options.entry,
                            name: 'Start',
                            type: 'agent',
                            agent: {
                                id: 'openai-assistant',
                                name: 'OpenAI Assistant',
                                type: 'openai',
                                model: 'gpt-3.5-turbo',
                                parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                                capabilities: ['text-generation'],
                                enabled: true
                            },
                            parameters: { prompt: 'Hello! Please start the workflow.' }
                        }
                    },
                    state: 'draft',
                    createdAt: now,
                    updatedAt: now
                };
            case 'complex':
                return {
                    id: workflowId,
                    name: options.name,
                    description: options.description,
                    version: '1.0.0',
                    entryPoint: options.entry,
                    steps: {
                        [options.entry]: {
                            id: options.entry,
                            name: 'Initial Analysis',
                            type: 'condition',
                            condition: 'data.request_type === "analysis"',
                            parameters: { input: 'data.user_input' }
                        },
                        'analysis-step': {
                            id: 'analysis-step',
                            name: 'Perform Analysis',
                            type: 'agent',
                            dependencies: [options.entry],
                            agent: {
                                id: 'openai-analyst',
                                name: 'OpenAI Analyst',
                                type: 'openai',
                                model: 'gpt-4',
                                parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                                capabilities: ['analysis', 'problem-solving'],
                                enabled: true
                            },
                            parameters: { prompt: 'Analyze the following input: {input}' }
                        },
                        'wait-step': {
                            id: 'wait-step',
                            name: 'Processing Delay',
                            type: 'wait',
                            dependencies: [options.entry],
                            parameters: { duration: 1000 }
                        },
                        'parallel-execution': {
                            id: 'parallel-execution',
                            name: 'Parallel Processing',
                            type: 'parallel',
                            dependencies: [options.entry],
                            steps: [
                                {
                                    id: 'step-1',
                                    name: 'Processing Task 1',
                                    type: 'agent',
                                    agent: {
                                        id: 'openai-processor-1',
                                        name: 'Processor 1',
                                        type: 'openai',
                                        model: 'gpt-3.5-turbo',
                                        parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                                        capabilities: ['text-generation'],
                                        enabled: true
                                    }
                                },
                                {
                                    id: 'step-2',
                                    name: 'Processing Task 2',
                                    type: 'agent',
                                    agent: {
                                        id: 'openai-processor-2',
                                        name: 'Processor 2',
                                        type: 'openai',
                                        model: 'gpt-3.5-turbo',
                                        parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                                        capabilities: ['text-generation'],
                                        enabled: true
                                    }
                                }
                            ]
                        },
                        'completion': {
                            id: 'completion',
                            name: 'Workflow Completion',
                            type: 'sequence',
                            dependencies: ['analysis-step', 'wait-step', 'parallel-execution'],
                            steps: [
                                {
                                    id: 'final-step-1',
                                    name: 'Final Processing',
                                    type: 'agent',
                                    agent: {
                                        id: 'openai-final',
                                        name: 'Final Processor',
                                        type: 'openai',
                                        model: 'gpt-4',
                                        parameters: { apiKey: process.env.OPENAI_API_KEY || '' },
                                        capabilities: ['text-generation'],
                                        enabled: true
                                    }
                                }
                            ]
                        }
                    },
                    state: 'draft',
                    createdAt: now,
                    updatedAt: now
                };
            default:
                throw new Error(`Unknown template: ${template}`);
        }
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
exports.WorkflowBuilder = WorkflowBuilder;
//# sourceMappingURL=workflow-builder.js.map