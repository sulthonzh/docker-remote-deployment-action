"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionCommand = void 0;
const commander_1 = require("commander");
const logger_1 = require("../utils/logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
class ExecutionCommand {
    orchestrator;
    logger;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = new logger_1.Logger('info');
    }
    registerCommands(program) {
        program
            .command('execute')
            .description('Workflow execution commands')
            .addCommand(this.createExecuteCommand())
            .addCommand(this.createExecuteListCommand())
            .addCommand(this.createExecuteShowCommand())
            .addCommand(this.createExecutePauseCommand())
            .addCommand(this.createExecuteResumeCommand())
            .addCommand(this.createExecuteStopCommand())
            .addCommand(this.createExecuteCleanupCommand())
            .addCommand(this.createExecuteStatsCommand());
    }
    createExecuteCommand() {
        return new commander_1.Command('start')
            .description('Execute a workflow')
            .requiredOption('-w, --workflow <workflowId>', 'Workflow ID')
            .option('-i, --input <input>', 'Input data file (JSON)')
            .option('--input-json <json>', 'Input data as JSON string')
            .option('-d, --data <key=value>', 'Input data (can be used multiple times)', (value, prev) => {
            if (!prev)
                prev = [];
            prev.push(value);
            return prev;
        })
            .option('--timeout <timeout>', 'Execution timeout in milliseconds', parseInt)
            .option('--watch', 'Watch execution progress')
            .option('--json', 'Output in JSON format')
            .action(async (options) => {
            try {
                // Prepare input data
                let inputData = {};
                if (options.input) {
                    inputData = await fs_extra_1.default.readJSON(options.input);
                }
                else if (options.inputJson) {
                    inputData = JSON.parse(options.inputJson);
                }
                // Add key=value pairs
                if (options.data) {
                    for (const pair of options.data) {
                        const [key, value] = pair.split('=');
                        inputData[key] = value;
                    }
                }
                console.log(`Starting workflow execution: ${options.workflow}`);
                console.log(`Input data: ${JSON.stringify(inputData, null, 2)}`);
                if (options.watch) {
                    await this.executeWithWatch(options.workflow, inputData, options);
                }
                else {
                    const startTime = Date.now();
                    const result = await this.orchestrator.executeWorkflow(options.workflow, inputData);
                    const endTime = Date.now();
                    if (options.json) {
                        console.log(JSON.stringify({
                            executionTime: endTime - startTime,
                            result
                        }, null, 2));
                    }
                    else {
                        console.log(`Execution completed in ${endTime - startTime}ms`);
                        console.log(`Status: ${result.status}`);
                        console.log(`Current Step: ${result.currentStep}`);
                        console.log(`Data: ${JSON.stringify(result.data, null, 2)}`);
                        console.log(`Steps Completed: ${result.history.filter(s => s.status === 'completed').length}`);
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to execute workflow:', error);
                process.exit(1);
            }
        });
    }
    createExecuteListCommand() {
        return new commander_1.Command('list')
            .description('List workflow executions')
            .option('--workflow <workflowId>', 'Filter by workflow ID')
            .option('--status <status>', 'Filter by status (running, completed, failed, paused)')
            .option('--json', 'Output in JSON format')
            .option('--limit <limit>', 'Limit number of results', parseInt)
            .option('--since <date>', 'Show executions since date (ISO format)')
            .action(async (options) => {
            try {
                const executions = await this.orchestrator.stateManager.listWorkflowStates(options.workflow);
                // Filter by status
                let filteredExecutions = executions;
                if (options.status) {
                    filteredExecutions = executions.filter(execution => execution.status === options.status);
                }
                // Filter by date
                if (options.since) {
                    const sinceDate = new Date(options.since);
                    filteredExecutions = executions.filter(execution => {
                        const executionDate = execution.startTime || execution.createdAt;
                        return executionDate >= sinceDate;
                    });
                }
                // Limit results
                if (options.limit) {
                    filteredExecutions = filteredExecutions.slice(0, options.limit);
                }
                // Sort by date (newest first)
                filteredExecutions.sort((a, b) => {
                    const aTime = a.startTime || a.createdAt;
                    const bTime = b.startTime || b.createdAt;
                    return bTime.getTime() - aTime.getTime();
                });
                if (options.json) {
                    console.log(JSON.stringify(filteredExecutions, null, 2));
                }
                else {
                    console.log('Workflow Executions:');
                    filteredExecutions.forEach(execution => {
                        const statusIcon = this.getStatusIcon(execution.status);
                        const workflowName = execution.workflowId;
                        const date = (execution.startTime || execution.createdAt).toISOString();
                        console.log(`  ${statusIcon} ${workflowName} - ${execution.status}`);
                        console.log(`    Started: ${date}`);
                        console.log(`    Current Step: ${execution.currentStep}`);
                        console.log(`    Steps Completed: ${execution.history.filter(s => s.status === 'completed').length}`);
                        console.log('');
                    });
                }
            }
            catch (error) {
                this.logger.error('Failed to list executions:', error);
                process.exit(1);
            }
        });
    }
    createExecuteShowCommand() {
        return new commander_1.Command('show')
            .description('Show execution details')
            .requiredOption('-e, --execution <executionId>', 'Execution ID')
            .option('--json', 'Output in JSON format')
            .option('--steps', 'Show step details')
            .option('--history', 'Show execution history')
            .action(async (options) => {
            try {
                const execution = await this.orchestrator.stateManager.getWorkflowState(options.execution);
                if (!execution) {
                    console.log(`Execution not found: ${options.execution}`);
                    return;
                }
                if (options.json) {
                    console.log(JSON.stringify(execution, null, 2));
                }
                else {
                    const statusIcon = this.getStatusIcon(execution.status);
                    console.log(`${statusIcon} Execution: ${options.execution}`);
                    console.log(`Workflow: ${execution.workflowId}`);
                    console.log(`Status: ${execution.status}`);
                    console.log(`Current Step: ${execution.currentStep}`);
                    console.log(`Started: ${(execution.startTime || execution.createdAt).toISOString()}`);
                    if (execution.endTime) {
                        console.log(`Ended: ${execution.endTime.toISOString()}`);
                    }
                    if (execution.error) {
                        console.log(`Error: ${execution.error}`);
                    }
                    if (options.steps) {
                        console.log('\nSteps:');
                        execution.history.forEach(step => {
                            const stepIcon = this.getStatusIcon(step.status);
                            console.log(`  ${stepIcon} ${step.stepName} (${step.stepId})`);
                            console.log(`    Status: ${step.status}`);
                            console.log(`    Started: ${step.startTime?.toISOString() || 'N/A'}`);
                            console.log(`    Ended: ${step.endTime?.toISOString() || 'N/A'}`);
                            if (step.duration) {
                                console.log(`    Duration: ${step.duration}ms`);
                            }
                            if (step.retryCount > 0) {
                                console.log(`    Retries: ${step.retryCount}`);
                            }
                            if (step.error) {
                                console.log(`    Error: ${step.error}`);
                            }
                        });
                    }
                    if (options.history) {
                        console.log('\nExecution History:');
                        execution.history.forEach((step, index) => {
                            console.log(`${index + 1}. ${step.stepName} - ${step.status} (${step.duration}ms)`);
                            if (step.result) {
                                console.log(`   Result: ${JSON.stringify(step.result, null, 2)}`);
                            }
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error('Failed to show execution:', error);
                process.exit(1);
            }
        });
    }
    createExecutePauseCommand() {
        return new commander_1.Command('pause')
            .description('Pause a workflow execution')
            .requiredOption('-e, --execution <executionId>', 'Execution ID')
            .action(async (options) => {
            try {
                await this.orchestrator.pauseWorkflow(options.execution, options.execution);
                console.log(`Execution paused: ${options.execution}`);
            }
            catch (error) {
                this.logger.error('Failed to pause execution:', error);
                process.exit(1);
            }
        });
    }
    createExecuteResumeCommand() {
        return new commander_1.Command('resume')
            .description('Resume a paused workflow execution')
            .requiredOption('-e, --execution <executionId>', 'Execution ID')
            .action(async (options) => {
            try {
                const result = await this.orchestrator.resumeWorkflow(options.execution, options.execution);
                console.log(`Execution resumed: ${options.execution}`);
                console.log(`Current Status: ${result.status}`);
                console.log(`Current Step: ${result.currentStep}`);
            }
            catch (error) {
                this.logger.error('Failed to resume execution:', error);
                process.exit(1);
            }
        });
    }
    createExecuteStopCommand() {
        return new commander_1.Command('stop')
            .description('Stop a workflow execution')
            .requiredOption('-e, --execution <executionId>', 'Execution ID')
            .option('--reason <reason>', 'Reason for stopping')
            .action(async (options) => {
            try {
                await this.orchestrator.stopWorkflow(options.execution, options.execution);
                console.log(`Execution stopped: ${options.execution}`);
                if (options.reason) {
                    console.log(`Reason: ${options.reason}`);
                }
            }
            catch (error) {
                this.logger.error('Failed to stop execution:', error);
                process.exit(1);
            }
        });
    }
    createExecuteCleanupCommand() {
        return new commander_1.Command('cleanup')
            .description('Clean up old executions')
            .option('--older-than <days>', 'Delete older than N days', parseInt)
            .option('--status <status>', 'Only cleanup executions with this status')
            .option('--force', 'Force cleanup without confirmation')
            .action(async (options) => {
            try {
                const executions = await this.orchestrator.stateManager.listWorkflowStates();
                let toDelete = [];
                for (const execution of executions) {
                    if (options.status && execution.status !== options.status) {
                        continue;
                    }
                    if (options.olderThan) {
                        const executionDate = execution.startTime || execution.createdAt;
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - options.olderThan);
                        if (executionDate < cutoffDate) {
                            toDelete.push(execution.workflowId); // Note: This needs to be execution ID, not workflow ID
                        }
                    }
                }
                if (toDelete.length === 0) {
                    console.log('No executions to cleanup');
                    return;
                }
                if (!options.force) {
                    console.log(`Found ${toDelete.length} executions to cleanup:`);
                    toDelete.forEach(id => console.log(`  - ${id}`));
                    const confirmation = await this.promptConfirmation('Continue with cleanup?');
                    if (!confirmation) {
                        console.log('Cleanup cancelled.');
                        return;
                    }
                }
                // Note: This would need to be fixed to use execution IDs, not workflow IDs
                console.log(`Cleanup would delete ${toDelete.length} executions (not implemented in this demo)`);
            }
            catch (error) {
                this.logger.error('Failed to cleanup executions:', error);
                process.exit(1);
            }
        });
    }
    createExecuteStatsCommand() {
        return new commander_1.Command('stats')
            .description('Show execution statistics')
            .option('--workflow <workflowId>', 'Filter by workflow ID')
            .option('--json', 'Output in JSON format')
            .action(async (options) => {
            try {
                const stats = await this.orchestrator.stateManager.getStats();
                if (options.json) {
                    console.log(JSON.stringify(stats, null, 2));
                }
                else {
                    console.log('Execution Statistics:');
                    console.log(`Total Executions: ${stats.totalExecutions}`);
                    console.log(`Active Executions: ${stats.activeExecutions}`);
                    console.log(`Completed Executions: ${stats.completedExecutions}`);
                    console.log(`Failed Executions: ${stats.failedExecutions}`);
                    console.log(`Average Duration: ${stats.averageDuration}ms`);
                }
            }
            catch (error) {
                this.logger.error('Failed to get execution stats:', error);
                process.exit(1);
            }
        });
    }
    async executeWithWatch(workflowId, inputData, options) {
        // This is a simplified version - in practice, you'd use proper event listeners
        console.log('Watching execution progress...');
        // Start the execution
        const result = await this.orchestrator.executeWorkflow(workflowId, inputData);
        // Poll for status updates
        const checkStatus = async () => {
            const status = await this.orchestrator.stateManager.getWorkflowState(workflowId);
            if (status) {
                console.log(`\rStatus: ${status.status} | Current Step: ${status.currentStep}`);
                if (status.status === 'completed' || status.status === 'failed') {
                    clearInterval(interval);
                    console.log('\nExecution completed!');
                }
            }
        };
        const interval = setInterval(checkStatus, 1000);
        // Wait for completion
        return new Promise((resolve) => {
            const checkCompletion = async () => {
                const status = await this.orchestrator.stateManager.getWorkflowState(workflowId);
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    clearInterval(interval);
                    console.log('\nExecution completed!');
                    resolve();
                }
            };
            // Check every 2 seconds
            const completionInterval = setInterval(checkCompletion, 2000);
        });
    }
    getStatusIcon(status) {
        switch (status) {
            case 'running':
                return '🟡';
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'paused':
                return '⏸️';
            case 'waiting':
                return '⏳';
            default:
                return '⚪';
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
exports.ExecutionCommand = ExecutionCommand;
//# sourceMappingURL=execution-command.js.map