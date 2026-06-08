"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutor = void 0;
const logger_1 = require("../utils/logger");
class AgentExecutor {
    agents;
    logger;
    initialized = false;
    constructor(agents) {
        this.agents = agents;
        this.logger = new logger_1.Logger('info');
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Validate all agent configurations
        for (const agent of this.agents) {
            this.validateAgentConfig(agent);
        }
        this.initialized = true;
        this.logger.info(`Initialized ${this.agents.length} agents`);
    }
    async executeAgent(agentConfig, input) {
        if (!this.initialized) {
            throw new Error('AgentExecutor not initialized');
        }
        const startTime = Date.now();
        try {
            const agent = this.agents.find(a => a.id === agentConfig.id);
            if (!agent) {
                throw new Error(`Agent not found: ${agentConfig.id}`);
            }
            if (!agent.enabled) {
                throw new Error(`Agent is disabled: ${agent.name}`);
            }
            this.logger.info(`Executing agent: ${agent.name} (${agent.id})`);
            let result;
            switch (agent.type) {
                case 'openai':
                    result = await this.executeOpenAI(agent, input);
                    break;
                case 'claude':
                    result = await this.executeClaude(agent, input);
                    break;
                case 'local':
                    result = await this.executeLocal(agent, input);
                    break;
                case 'custom':
                    result = await this.executeCustom(agent, input);
                    break;
                default:
                    throw new Error(`Unsupported agent type: ${agent.type}`);
            }
            const duration = Date.now() - startTime;
            result.duration = duration;
            if (result.success) {
                this.logger.info(`Agent execution completed: ${agent.name} (${duration}ms)`);
            }
            else {
                this.logger.error(`Agent execution failed: ${agent.name} - ${result.error}`);
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Agent execution error: ${agentConfig.name} - ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                duration
            };
        }
    }
    async getAgentCapabilities(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        return agent.capabilities;
    }
    async listAgents() {
        return this.agents.filter(agent => agent.enabled);
    }
    async getAgent(agentId) {
        return this.agents.find(a => a.id === agentId) || null;
    }
    async addAgent(agent) {
        this.validateAgentConfig(agent);
        this.agents.push(agent);
        this.logger.info(`Added agent: ${agent.name} (${agent.id})`);
    }
    async updateAgent(agentId, updates) {
        const index = this.agents.findIndex(a => a.id === agentId);
        if (index === -1) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        this.agents[index] = {
            ...this.agents[index],
            ...updates
        };
        this.validateAgentConfig(this.agents[index]);
        this.logger.info(`Updated agent: ${agentId}`);
    }
    async removeAgent(agentId) {
        const index = this.agents.findIndex(a => a.id === agentId);
        if (index === -1) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        this.agents.splice(index, 1);
        this.logger.info(`Removed agent: ${agentId}`);
    }
    async cleanup() {
        // Any cleanup needed for agent connections
        this.initialized = false;
        this.logger.info('AgentExecutor cleaned up');
    }
    validateAgentConfig(agent) {
        if (!agent.id) {
            throw new Error('Agent ID is required');
        }
        if (!agent.name) {
            throw new Error('Agent name is required');
        }
        if (!agent.type) {
            throw new Error('Agent type is required');
        }
        if (!agent.model) {
            throw new Error('Agent model is required');
        }
        if (!agent.parameters) {
            agent.parameters = {};
        }
        if (!agent.capabilities) {
            agent.capabilities = [];
        }
        // Validate agent-specific configurations
        switch (agent.type) {
            case 'openai':
                if (!agent.endpoint) {
                    agent.endpoint = 'https://api.openai.com/v1';
                }
                break;
            case 'claude':
                if (!agent.endpoint) {
                    agent.endpoint = 'https://api.anthropic.com';
                }
                break;
            case 'local':
                if (!agent.endpoint) {
                    agent.endpoint = 'http://localhost:8000';
                }
                break;
        }
        // Set default values
        if (agent.timeout === undefined) {
            agent.timeout = 30000; // 30 seconds
        }
        if (agent.maxTokens === undefined) {
            agent.maxTokens = 1000;
        }
        if (agent.temperature === undefined) {
            agent.temperature = 0.7;
        }
    }
    async executeOpenAI(agent, input) {
        const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
        const prompt = input.prompt || input.message || '';
        const systemMessage = input.system || 'You are a helpful assistant.';
        const requestBody = {
            model: agent.model,
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ],
            max_tokens: agent.maxTokens,
            temperature: agent.temperature,
            ...agent.parameters
        };
        try {
            const response = await axios.post(`${agent.endpoint}/chat/completions`, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${agent.parameters.apiKey}`
                },
                timeout: agent.timeout
            });
            const content = response.data.choices[0]?.message?.content;
            return {
                success: true,
                data: {
                    content,
                    model: response.data.model,
                    usage: response.data.usage,
                    rawResponse: response.data
                },
                duration: 0
            };
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: `OpenAI API error: ${error.response?.data?.error?.message || error.message}`,
                    duration: 0
                };
            }
            return {
                success: false,
                error: `OpenAI execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: 0
            };
        }
    }
    async executeClaude(agent, input) {
        const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
        const prompt = input.prompt || input.message || '';
        const systemMessage = input.system || 'You are a helpful assistant.';
        const requestBody = {
            model: agent.model,
            max_tokens: agent.maxTokens,
            temperature: agent.temperature,
            system: systemMessage,
            messages: [
                { role: 'user', content: prompt }
            ],
            ...agent.parameters
        };
        try {
            const response = await axios.post(`${agent.endpoint}/messages`, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': agent.parameters.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                timeout: agent.timeout
            });
            const content = response.data.content[0]?.text;
            return {
                success: true,
                data: {
                    content,
                    model: response.data.model,
                    usage: response.data.usage,
                    rawResponse: response.data
                },
                duration: 0
            };
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: `Claude API error: ${error.response?.data?.error?.message || error.message}`,
                    duration: 0
                };
            }
            return {
                success: false,
                error: `Claude execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                duration: 0
            };
        }
    }
    async executeLocal(agent, input) {
        // For local models, we'll simulate execution with a simple response
        // In practice, this would connect to a local model server
        const prompt = input.prompt || input.message || '';
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        return {
            success: true,
            data: {
                content: `Local model response for: ${prompt}`,
                model: agent.model,
                processingTime: Math.random() * 1000 + 500,
                rawResponse: { local: true }
            },
            duration: 0
        };
    }
    async executeCustom(agent, input) {
        // Custom agent execution would be handled by plugins or extensions
        // For now, return a simple response with the input data
        return {
            success: true,
            data: {
                custom: true,
                agentName: agent.name,
                input,
                response: `Custom agent execution: ${agent.name}`
            },
            duration: 0
        };
    }
}
exports.AgentExecutor = AgentExecutor;
//# sourceMappingURL=agent-executor.js.map