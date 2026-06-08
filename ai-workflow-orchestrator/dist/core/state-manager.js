"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class StateManager {
    config;
    stateDir;
    metricsDir;
    initialized = false;
    constructor(config) {
        this.config = config;
        // Set default storage directories
        const baseDir = process.cwd();
        this.stateDir = path_1.default.join(baseDir, 'state');
        this.metricsDir = path_1.default.join(baseDir, 'metrics');
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Create state directory
            await fs_1.promises.mkdir(this.stateDir, { recursive: true });
            // Create metrics directory
            if (this.config.metrics.enabled) {
                await fs_1.promises.mkdir(this.metricsDir, { recursive: true });
            }
            this.initialized = true;
        }
        catch (error) {
            throw new Error(`Failed to initialize state manager: ${error}`);
        }
    }
    async saveWorkflowState(executionId, state) {
        const filePath = this.getStateFilePath(executionId);
        const serialized = JSON.stringify({
            ...state,
            createdAt: state.createdAt.toISOString(),
            startTime: state.startTime?.toISOString(),
            endTime: state.endTime?.toISOString(),
            history: state.history.map(step => ({
                ...step,
                startTime: step.startTime?.toISOString(),
                endTime: step.endTime?.toISOString()
            }))
        }, null, 2);
        await fs_1.promises.writeFile(filePath, serialized, 'utf-8');
    }
    async getWorkflowState(executionId) {
        try {
            const filePath = this.getStateFilePath(executionId);
            const data = await fs_1.promises.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            return {
                ...parsed,
                createdAt: new Date(parsed.createdAt),
                startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
                endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
                history: parsed.history.map((step) => ({
                    ...step,
                    startTime: step.startTime ? new Date(step.startTime) : undefined,
                    endTime: step.endTime ? new Date(step.endTime) : undefined
                }))
            };
        }
        catch (error) {
            return null;
        }
    }
    async listWorkflowStates(workflowId) {
        try {
            const files = await fs_1.promises.readdir(this.stateDir);
            const states = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const executionId = file.replace('.json', '');
                    const state = await this.getWorkflowState(executionId);
                    if (state && (!workflowId || state.workflowId === workflowId)) {
                        states.push(state);
                    }
                }
            }
            return states.sort((a, b) => {
                const aTime = a.startTime || a.createdAt;
                const bTime = b.startTime || b.createdAt;
                return bTime.getTime() - aTime.getTime();
            });
        }
        catch (error) {
            return [];
        }
    }
    async deleteWorkflowState(executionId) {
        try {
            const filePath = this.getStateFilePath(executionId);
            await fs_1.promises.unlink(filePath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async cleanupOldStates() {
        if (!this.config.metrics.enabled) {
            return;
        }
        const retentionDays = this.config.metrics.retentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        try {
            const files = await fs_1.promises.readdir(this.stateDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path_1.default.join(this.stateDir, file);
                    const stats = await fs_1.promises.stat(filePath);
                    if (stats.mtime < cutoffDate) {
                        await fs_1.promises.unlink(filePath);
                    }
                }
            }
        }
        catch (error) {
            // Log error but don't fail
            console.error('Error cleaning up old states:', error);
        }
    }
    async pauseWorkflow(executionId) {
        const state = await this.getWorkflowState(executionId);
        if (state) {
            state.status = 'paused';
            await this.saveWorkflowState(executionId, state);
        }
    }
    async resumeWorkflow(executionId) {
        const state = await this.getWorkflowState(executionId);
        if (state) {
            state.status = 'running';
            await this.saveWorkflowState(executionId, state);
        }
    }
    async stopWorkflow(executionId) {
        const state = await this.getWorkflowState(executionId);
        if (state) {
            state.status = 'failed';
            state.endTime = new Date();
            await this.saveWorkflowState(executionId, state);
        }
    }
    async saveMetrics(metrics) {
        if (!this.config.metrics.enabled) {
            return;
        }
        const filePath = this.getMetricsFilePath(metrics.executionId);
        const serialized = JSON.stringify({
            ...metrics,
            startTime: metrics.startTime.toISOString(),
            endTime: metrics.endTime?.toISOString()
        }, null, 2);
        await fs_1.promises.writeFile(filePath, serialized, 'utf-8');
    }
    async getMetrics(workflowId) {
        try {
            const files = await fs_1.promises.readdir(this.metricsDir);
            const metrics = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path_1.default.join(this.metricsDir, file);
                    const data = await fs_1.promises.readFile(filePath, 'utf-8');
                    const parsed = JSON.parse(data);
                    const metric = {
                        ...parsed,
                        startTime: new Date(parsed.startTime),
                        endTime: parsed.endTime ? new Date(parsed.endTime) : undefined
                    };
                    if (!workflowId || metric.workflowId === workflowId) {
                        metrics.push(metric);
                    }
                }
            }
            return metrics.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        }
        catch (error) {
            return [];
        }
    }
    async cleanupOldMetrics() {
        if (!this.config.metrics.enabled) {
            return;
        }
        const retentionDays = this.config.metrics.retentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        try {
            const files = await fs_1.promises.readdir(this.metricsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path_1.default.join(this.metricsDir, file);
                    const stats = await fs_1.promises.stat(filePath);
                    if (stats.mtime < cutoffDate) {
                        await fs_1.promises.unlink(filePath);
                    }
                }
            }
        }
        catch (error) {
            // Log error but don't fail
            console.error('Error cleaning up old metrics:', error);
        }
    }
    async getStats() {
        const states = await this.listWorkflowStates();
        const metrics = await this.getMetrics();
        const totalExecutions = states.length;
        const activeExecutions = states.filter(s => s.status === 'running').length;
        const completedExecutions = states.filter(s => s.status === 'completed').length;
        const failedExecutions = states.filter(s => s.status === 'failed').length;
        const durations = metrics
            .filter(m => m.duration !== undefined)
            .map(m => m.duration);
        const averageDuration = durations.length > 0
            ? durations.reduce((sum, dur) => sum + dur, 0) / durations.length
            : 0;
        return {
            totalExecutions,
            activeExecutions,
            completedExecutions,
            failedExecutions,
            averageDuration
        };
    }
    async cleanup() {
        try {
            await this.cleanupOldStates();
            await this.cleanupOldMetrics();
        }
        catch (error) {
            // Log error but don't fail
            console.error('Error during cleanup:', error);
        }
    }
    getStateFilePath(executionId) {
        return path_1.default.join(this.stateDir, `${executionId}.json`);
    }
    getMetricsFilePath(executionId) {
        return path_1.default.join(this.metricsDir, `${executionId}.json`);
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=state-manager.js.map