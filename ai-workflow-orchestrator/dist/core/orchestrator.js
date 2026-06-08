"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowOrchestrator = void 0;
const events_1 = require("events");
const state_manager_1 = require("./state-manager");
const agent_executor_1 = require("./agent-executor");
const workflow_engine_1 = require("./workflow-engine");
const logger_1 = require("../utils/logger");
class WorkflowOrchestrator extends events_1.EventEmitter {
    config;
    stateManager;
    agentExecutor;
    workflowEngine;
    logger;
    isRunning = false;
    constructor(config) {
        super();
        this.config = config;
        this.logger = new logger_1.Logger(config.logging.level);
        this.stateManager = new state_manager_1.StateManager(config.storage);
        this.agentExecutor = new agent_executor_1.AgentExecutor(config.agents);
        this.workflowEngine = new workflow_engine_1.WorkflowEngine(this.agentExecutor, this.stateManager, this.logger);
        this.setupEventHandlers();
    }
    // Factory method for simplified configuration
    static create(storageConfig) {
        const defaultConfig = {
            workflows: [],
            agents: [],
            storage: storageConfig,
            logging: { level: 'info' },
            metrics: { enabled: true, retentionDays: 30 }
        };
        return new WorkflowOrchestrator(defaultConfig);
    }
    setupEventHandlers() {
        this.workflowEngine.on('stepStarted', (data) => {
            this.emit('stepStarted', data);
        });
        this.workflowEngine.on('stepCompleted', (data) => {
            this.emit('stepCompleted', data);
        });
        this.workflowEngine.on('stepFailed', (data) => {
            this.emit('stepFailed', data);
        });
        this.workflowEngine.on('workflowCompleted', (data) => {
            this.emit('workflowCompleted', data);
        });
        this.workflowEngine.on('workflowFailed', (data) => {
            this.emit('workflowFailed', data);
        });
    }
    async start() {
        if (this.isRunning) {
            throw new Error('Orchestrator is already running');
        }
        this.logger.info('Starting AI Workflow Orchestrator');
        this.isRunning = true;
        await this.stateManager.initialize();
        await this.agentExecutor.initialize();
        this.emit('started');
        this.logger.info('AI Workflow Orchestrator started successfully');
    }
    async stop() {
        if (!this.isRunning) {
            throw new Error('Orchestrator is not running');
        }
        this.logger.info('Stopping AI Workflow Orchestrator');
        this.isRunning = false;
        await this.agentExecutor.cleanup();
        await this.stateManager.cleanup();
        this.emit('stopped');
        this.logger.info('AI Workflow Orchestrator stopped successfully');
    }
    async executeWorkflow(workflowId, inputData) {
        if (!this.isRunning) {
            throw new Error('Orchestrator is not running');
        }
        const workflow = this.config.workflows.find(w => w.id === workflowId);
        if (!workflow) {
            throw new Error(`Workflow with ID ${workflowId} not found`);
        }
        this.logger.info(`Executing workflow: ${workflow.name} (${workflowId})`);
        return await this.workflowEngine.execute(workflow, inputData);
    }
    async pauseWorkflow(workflowId, executionId) {
        await this.stateManager.pauseWorkflow(executionId);
        this.logger.info(`Paused workflow execution: ${executionId}`);
    }
    async resumeWorkflow(workflowId, executionId) {
        await this.stateManager.resumeWorkflow(executionId);
        this.logger.info(`Resumed workflow execution: ${executionId}`);
        const state = await this.stateManager.getWorkflowState(executionId);
        if (state && state.status === 'running') {
            const workflow = this.config.workflows.find(w => w.id === workflowId);
            if (workflow) {
                return await this.workflowEngine.continueExecution(workflow, executionId);
            }
        }
        return state;
    }
    async stopWorkflow(workflowId, executionId) {
        await this.stateManager.stopWorkflow(executionId);
        this.logger.info(`Stopped workflow execution: ${executionId}`);
    }
    async getWorkflowStatus(executionId) {
        return await this.stateManager.getWorkflowState(executionId);
    }
    async listWorkflows() {
        return this.config.workflows;
    }
    async getWorkflow(workflowId) {
        return this.config.workflows.find(w => w.id === workflowId) || null;
    }
    async addWorkflow(workflow) {
        this.config.workflows.push(workflow);
        this.logger.info(`Added workflow: ${workflow.name} (${workflow.id})`);
    }
    async updateWorkflow(workflowId, updates) {
        const index = this.config.workflows.findIndex(w => w.id === workflowId);
        if (index === -1) {
            throw new Error(`Workflow with ID ${workflowId} not found`);
        }
        this.config.workflows[index] = {
            ...this.config.workflows[index],
            ...updates,
            updatedAt: new Date()
        };
        this.logger.info(`Updated workflow: ${workflowId}`);
    }
    async removeWorkflow(workflowId) {
        const index = this.config.workflows.findIndex(w => w.id === workflowId);
        if (index === -1) {
            throw new Error(`Workflow with ID ${workflowId} not found`);
        }
        this.config.workflows.splice(index, 1);
        this.logger.info(`Removed workflow: ${workflowId}`);
    }
    async getMetrics(workflowId) {
        return await this.stateManager.getMetrics(workflowId);
    }
    async getStats() {
        return await this.stateManager.getStats();
    }
    isRunningStatus() {
        return this.isRunning;
    }
}
exports.WorkflowOrchestrator = WorkflowOrchestrator;
//# sourceMappingURL=orchestrator.js.map