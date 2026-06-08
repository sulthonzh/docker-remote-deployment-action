"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const tracker_1 = require("./tracker");
const chalk_1 = __importDefault(require("chalk"));
class ReportGenerator {
    tracker;
    constructor(databasePath) {
        this.tracker = new tracker_1.TokenTracker(databasePath);
    }
    async generateReport(options = {}) {
        const { agentName, days = 7, format = 'summary' } = options;
        if (format === 'json') {
            return await this.generateJsonReport(agentName);
        }
        else if (format === 'table') {
            return this.generateTableReport(agentName);
        }
        else {
            return await this.generateSummaryReport(agentName, days);
        }
    }
    async generateJsonReport(agentName) {
        const metrics = await this.tracker.getAgentMetrics(agentName);
        return JSON.stringify(metrics, null, 2);
    }
    async generateTableReport(agentName) {
        const summary = await this.generateSummary(agentName);
        let table = 'Agent Usage Report\n';
        table += '='.repeat(50) + '\n\n';
        table += 'Agent'.padEnd(25) + 'Tokens'.padEnd(15) + 'Cost'.padEnd(15) + 'Tools\n';
        table += '-'.repeat(55) + '\n';
        summary.agents.forEach(agent => {
            table += agent.name.padEnd(25) +
                agent.tokens.toLocaleString().padEnd(15) +
                `$${agent.cost.toFixed(4)}`.padEnd(15) +
                '0\n';
        });
        return chalk_1.default.cyan(table);
    }
    async generateSummaryReport(agentName, days = 7) {
        const summary = await this.generateSummary(agentName);
        const recommendations = await this.tracker.getRecommendations(agentName);
        let report = '';
        // Header
        report += chalk_1.default.bold.blue('📊 Agent Cost Observatory Report\n');
        report += chalk_1.default.gray(''.padEnd(50, '=')) + '\n\n';
        // Summary
        report += chalk_1.default.bold('📈 Overall Summary\n');
        report += chalk_1.default.gray(''.padEnd(20, '-')) + '\n';
        report += chalk_1.default.green(`Total Tokens Used: ${summary.totalTokens.toLocaleString()}\n`);
        report += chalk_1.default.green(`Total Cost: $${summary.totalCost.toFixed(4)}\n`);
        report += chalk_1.default.green(`Agents Tracked: ${summary.agents.length}\n`);
        report += chalk_1.default.gray(`Report Period: Last ${days} days\n\n`);
        // Agent breakdown
        if (summary.agents.length > 0) {
            report += chalk_1.default.bold('🤖 Agent Breakdown\n');
            report += chalk_1.default.gray(''.padEnd(15, '-')) + '\n';
            const sortedAgents = summary.agents.sort((a, b) => b.cost - a.cost);
            sortedAgents.slice(0, 5).forEach((agent, index) => {
                const avgCostPerToken = agent.cost / agent.tokens;
                const efficiencyScore = this.calculateEfficiencyScore(agent);
                report += chalk_1.default.yellow(`${index + 1}. ${agent.name}\n`);
                report += `   Tokens: ${agent.tokens.toLocaleString()}\n`;
                report += `   Cost: $${agent.cost.toFixed(4)}\n`;
                report += `   Avg cost/token: $${avgCostPerToken.toFixed(6)}\n`;
                report += `   Efficiency: ${efficiencyScore}★\n\n`;
            });
        }
        // Tool breakdown
        if (summary.tools.length > 0) {
            report += chalk_1.default.bold('🔧 Tool Breakdown (Top 5)\n');
            report += chalk_1.default.gray(''.padEnd(15, '-')) + '\n';
            const sortedTools = summary.tools.sort((a, b) => b.cost - a.cost);
            sortedTools.slice(0, 5).forEach((tool, index) => {
                const avgTokensPerCall = tool.tokens / tool.calls;
                const costEfficiency = tool.calls > 0 ? tool.cost / tool.calls : 0;
                report += chalk_1.default.magenta(`${index + 1}. ${tool.name}\n`);
                report += `   Calls: ${tool.calls.toLocaleString()}\n`;
                report += `   Tokens: ${tool.tokens.toLocaleString()}\n`;
                report += `   Cost: $${tool.cost.toFixed(4)}\n`;
                report += `   Avg tokens/call: ${avgTokensPerCall.toFixed(1)}\n`;
                report += `   Avg cost/call: $${costEfficiency.toFixed(6)}\n\n`;
            });
        }
        // Cost warnings
        if (summary.totalCost > 1) {
            report += chalk_1.default.bold.red('⚠️ Cost Warnings\n');
            report += chalk_1.default.gray(''.padEnd(15, '-')) + '\n';
            const expensiveTools = summary.tools.filter(tool => tool.cost > 0.5);
            if (expensiveTools.length > 0) {
                report += chalk_1.default.red('High-cost tools detected:\n');
                expensiveTools.forEach(tool => {
                    report += `  • ${tool.name}: $${tool.cost.toFixed(4)} (${tool.tokens.toLocaleString()} tokens)\n`;
                });
                report += '\n';
            }
        }
        // Recommendations
        if (recommendations.length > 0) {
            report += chalk_1.default.bold.yellow('💡 Optimization Recommendations\n');
            report += chalk_1.default.gray(''.padEnd(25, '-')) + '\n';
            recommendations.forEach(rec => {
                report += `• ${rec}\n`;
            });
            report += '\n';
        }
        // Insights
        report += chalk_1.default.bold('🔍 Insights\n');
        report += chalk_1.default.gray(''.padEnd(12, '-')) + '\n';
        if (summary.agents.length > 0) {
            const avgCostPerAgent = summary.totalCost / summary.agents.length;
            const avgTokensPerAgent = summary.totalTokens / summary.agents.length;
            report += `• Average cost per agent: $${avgCostPerAgent.toFixed(4)}\n`;
            report += `• Average tokens per agent: ${avgTokensPerAgent.toLocaleString()}\n`;
            const mostActiveAgent = summary.agents.reduce((max, agent) => agent.tokens > max.tokens ? agent : max, summary.agents[0]);
            report += `• Most active agent: ${mostActiveAgent.name} (${mostActiveAgent.tokens.toLocaleString()} tokens)\n`;
            if (summary.tools.length > 0) {
                const mostUsedTool = summary.tools.reduce((max, tool) => tool.calls > max.calls ? tool : max, summary.tools[0]);
                report += `• Most used tool: ${mostUsedTool.name} (${mostUsedTool.calls} calls)\n`;
                const mostExpensiveTool = summary.tools.reduce((max, tool) => tool.cost > max.cost ? tool : max, summary.tools[0]);
                report += `• Most expensive tool: ${mostExpensiveTool.name} ($${mostExpensiveTool.cost.toFixed(4)})\n`;
            }
        }
        return report;
    }
    calculateEfficiencyScore(agent) {
        const avgCostPerToken = agent.cost / agent.tokens;
        if (avgCostPerToken < 0.00001)
            return '★★★★★'; // Very efficient
        if (avgCostPerToken < 0.00005)
            return '★★★★☆'; // Efficient
        if (avgCostPerToken < 0.0001)
            return '★★★☆☆'; // Average
        if (avgCostPerToken < 0.0002)
            return '★★☆☆☆'; // Inefficient
        return '★☆☆☆☆'; // Very inefficient
    }
    async generateSummary(agentName) {
        return await this.tracker.getUsageSummary(agentName);
    }
    async getRecommendations(agentName) {
        return await this.tracker.getRecommendations(agentName);
    }
    close() {
        this.tracker.close();
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=reporter.js.map