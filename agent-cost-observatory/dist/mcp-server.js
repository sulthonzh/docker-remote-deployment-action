"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPObservatoryServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const database_1 = require("./database");
class MCPObservatoryServer {
    server;
    db;
    activeAgents = new Map();
    constructor(databasePath) {
        this.db = new database_1.DatabaseManager(databasePath);
        this.server = new index_js_1.Server({
            name: 'agent-cost-observatory',
            version: '0.1.0',
            description: 'Observability tool for AI agent token usage and costs',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'observe_agent',
                        description: 'Track token usage for an agent session',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentName: {
                                    type: 'string',
                                    description: 'Name of the agent being tracked'
                                },
                                modelName: {
                                    type: 'string',
                                    description: 'Model name (e.g., gpt-4, claude-3)',
                                    default: 'gpt-4'
                                },
                                inputTokens: {
                                    type: 'number',
                                    description: 'Number of input tokens'
                                },
                                outputTokens: {
                                    type: 'number',
                                    description: 'Number of output tokens'
                                },
                                toolName: {
                                    type: 'string',
                                    description: 'Name of the tool being called'
                                },
                                timestamp: {
                                    type: 'number',
                                    description: 'Unix timestamp of the call'
                                }
                            },
                            required: ['agentName', 'inputTokens', 'outputTokens', 'toolName']
                        }
                    },
                    {
                        name: 'generate_report',
                        description: 'Generate cost and usage report for tracked agents',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentName: {
                                    type: 'string',
                                    description: 'Specific agent to report on (optional)'
                                },
                                days: {
                                    type: 'number',
                                    description: 'Number of days to include in report',
                                    default: 7
                                },
                                format: {
                                    type: 'string',
                                    description: 'Output format: json, table, or summary',
                                    enum: ['json', 'table', 'summary'],
                                    default: 'summary'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_recommendations',
                        description: 'Get optimization recommendations based on usage patterns',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentName: {
                                    type: 'string',
                                    description: 'Specific agent to analyze (optional)'
                                }
                            }
                        }
                    }
                ]
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'observe_agent':
                        return await this.handleObserveAgent(args);
                    case 'generate_report':
                        return await this.handleGenerateReport(args);
                    case 'get_recommendations':
                        return await this.handleGetRecommendations(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    async handleObserveAgent(args) {
        const { agentName, modelName, inputTokens, outputTokens, toolName, timestamp = Date.now() } = args;
        const totalTokens = inputTokens + outputTokens;
        const tokenUsage = {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            timestamp,
            model: modelName
        };
        if (!this.activeAgents.has(agentName)) {
            this.activeAgents.set(agentName, {
                agentName,
                toolCalls: new Map(),
                sessionTokens: [],
                startTime: timestamp
            });
        }
        const agent = this.activeAgents.get(agentName);
        agent.sessionTokens.push(tokenUsage);
        if (!agent.toolCalls.has(toolName)) {
            agent.toolCalls.set(toolName, {
                toolName,
                callCount: 0,
                totalTokens: 0,
                avgTokens: 0,
                totalCost: 0,
                lastCalled: timestamp,
                tokenUsage: []
            });
        }
        const toolMetrics = agent.toolCalls.get(toolName);
        toolMetrics.callCount++;
        toolMetrics.totalTokens += totalTokens;
        toolMetrics.avgTokens = toolMetrics.totalTokens / toolMetrics.callCount;
        toolMetrics.totalCost += this.calculateCost(tokenUsage);
        toolMetrics.lastCalled = timestamp;
        toolMetrics.tokenUsage.push(tokenUsage);
        // Save to database using new methods
        const agentId = await this.db.upsertAgent(agentName);
        const sessionId = `${agentName}-${Date.now()}`;
        const sessionIdValue = await this.db.insertSession(agentId, sessionId);
        if (toolName) {
            const toolId = await this.db.getOrInsertTool(agentId, toolName);
            await this.db.updateToolMetrics(toolId, tokenUsage.total, this.calculateCost(tokenUsage));
            await this.db.insertTokenUsage(sessionIdValue, toolId, tokenUsage);
        }
        else {
            await this.db.insertTokenUsage(sessionIdValue, null, tokenUsage);
        }
        await this.db.updateAgentTotals(agentId, tokenUsage.total, this.calculateCost(tokenUsage));
        return {
            content: [{
                    type: 'text',
                    text: `📊 Tracked ${agentName}: ${toolName} used ${totalTokens} tokens (${inputTokens} in, ${outputTokens} out)`
                }]
        };
    }
    async handleGenerateReport(args) {
        const { agentName, days = 7, format = 'summary' } = args;
        await this.db.cleanupOldData(days);
        const agents = await this.db.getAgentMetrics(agentName);
        if (format === 'json') {
            const report = JSON.stringify(agents, null, 2);
            return {
                content: [{
                        type: 'text',
                        text: report
                    }]
            };
        }
        if (agents.length === 0) {
            return {
                content: [{
                        type: 'text',
                        text: 'No data found for the specified criteria'
                    }]
            };
        }
        let report = '';
        if (format === 'table') {
            report += 'Agent Cost Report\n';
            report += '='.repeat(50) + '\n\n';
            for (const agent of agents) {
                report += `Agent: ${agent.agentName}\n`;
                report += `Total Tokens: ${agent.totalTokens.toLocaleString()}\n`;
                report += `Total Cost: $${agent.totalCost.toFixed(4)}\n`;
                report += `Tools Used: ${agent.toolCalls.length}\n`;
                report += `Start Time: ${new Date(agent.startTime).toLocaleString()}\n`;
                if (agent.endTime) {
                    report += `End Time: ${new Date(agent.endTime).toLocaleString()}\n`;
                }
                report += '\nTool Details:\n';
                report += '-'.repeat(30) + '\n';
                for (const tool of agent.toolCalls) {
                    report += `${tool.toolName}:\n`;
                    report += `  Calls: ${tool.callCount}\n`;
                    report += `  Total Tokens: ${tool.totalTokens.toLocaleString()}\n`;
                    report += `  Avg Tokens: ${tool.avgTokens.toFixed(1)}\n`;
                    report += `  Cost: $${tool.totalCost.toFixed(4)}\n`;
                    report += `  Last Used: ${new Date(tool.lastCalled).toLocaleString()}\n\n`;
                }
                report += '\n' + '='.repeat(50) + '\n\n';
            }
        }
        else {
            // Summary format
            let totalTokens = 0;
            let totalCost = 0;
            for (const agent of agents) {
                totalTokens += agent.totalTokens;
                totalCost += agent.totalCost;
            }
            report += `📊 Agent Cost Summary (Last ${days} days)\n`;
            report += '='.repeat(40) + '\n\n';
            report += `Total Agents Tracked: ${agents.length}\n`;
            report += `Total Tokens Used: ${totalTokens.toLocaleString()}\n`;
            report += `Total Cost: $${totalCost.toFixed(4)}\n`;
            report += `Avg Cost per Agent: $${(totalCost / agents.length).toFixed(4)}\n\n`;
            if (agents.length > 0) {
                report += 'Top Agents by Cost:\n';
                report += '-'.repeat(20) + '\n';
                const sortedByCost = agents.sort((a, b) => b.totalCost - a.totalCost);
                for (const agent of sortedByCost.slice(0, 5)) {
                    const avgCostPerToken = agent.totalCost / agent.totalTokens;
                    report += `• ${agent.agentName}: $${agent.totalCost.toFixed(4)} (${agent.totalTokens.toLocaleString()} tokens)\n`;
                    report += `  Avg cost/token: $${avgCostPerToken.toFixed(6)}\n`;
                }
            }
            // Get recommendations
            const recommendations = this.generateRecommendations(agents);
            if (recommendations.length > 0) {
                report += '\n💡 Recommendations:\n';
                report += '-'.repeat(15) + '\n';
                recommendations.forEach(rec => report += `• ${rec}\n`);
            }
        }
        return {
            content: [{
                    type: 'text',
                    text: report
                }]
        };
    }
    async handleGetRecommendations(args) {
        const { agentName } = args;
        const agents = await this.db.getAgentMetrics(agentName);
        const recommendations = this.generateRecommendations(agents);
        return {
            content: [{
                    type: 'text',
                    text: recommendations.length > 0
                        ? `💡 Recommendations:\n\n${recommendations.map(r => `• ${r}`).join('\n')}`
                        : 'No optimization recommendations available at this time.'
                }]
        };
    }
    generateRecommendations(agents) {
        const recommendations = [];
        for (const agent of agents) {
            if (agent.toolCalls.length === 0)
                continue;
            // Find most expensive tool
            let mostExpensiveTool = null;
            let maxCost = 0;
            for (const tool of agent.toolCalls) {
                if (tool.totalCost > maxCost) {
                    maxCost = tool.totalCost;
                    mostExpensiveTool = tool;
                }
            }
            if (mostExpensiveTool && mostExpensiveTool.totalCost > agent.totalCost * 0.3) {
                const avgTokens = mostExpensiveTool.totalTokens / mostExpensiveTool.callCount;
                recommendations.push(`${agent.agentName}'s ${mostExpensiveTool.toolName} is expensive. Consider reducing context or caching results.`);
            }
            // Find high-frequency tools
            for (const tool of agent.toolCalls) {
                if (tool.callCount > 50 && tool.avgTokens > 1000) {
                    recommendations.push(`${agent.agentName} calls ${tool.toolName} frequently. Consider implementing caching or batch operations.`);
                }
            }
        }
        if (recommendations.length === 0) {
            recommendations.push('Your token usage looks optimized. Consider setting up cost alerts.');
        }
        return recommendations;
    }
    calculateCost(tokenUsage) {
        const pricing = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
            'claude-3': { input: 0.015, output: 0.075 },
            'claude-2': { input: 0.011, output: 0.032 },
            'gemini-pro': { input: 0.00125, output: 0.0025 },
            'default': { input: 0.01, output: 0.03 }
        };
        const model = pricing[tokenUsage.model] || pricing.default;
        return ((tokenUsage.input * model.input) + (tokenUsage.output * model.output)) / 1000;
    }
    async start() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.log('Agent Cost Observatory MCP server started');
    }
    stop() {
        this.db.close();
    }
}
exports.MCPObservatoryServer = MCPObservatoryServer;
async function main() {
    const server = new MCPObservatoryServer('./data/observatory.db');
    await server.start();
    // Handle process shutdown
    process.on('SIGINT', () => {
        server.stop();
        process.exit(0);
    });
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=mcp-server.js.map