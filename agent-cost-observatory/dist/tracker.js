"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenTracker = void 0;
class TokenTracker {
    db;
    constructor(db) {
        this.db = db;
    }
    async trackTokenUsage(record) {
        try {
            // Validate record
            this.validateTokenRecord(record);
            // Insert into database
            const id = await this.db.insertTokenUsage(record);
            console.log(`✓ Tracked token usage: ${record.total_tokens} tokens ($${record.cost_usd.toFixed(6)}) for ${record.tool_name}`);
            return id;
        }
        catch (error) {
            console.error("Failed to track token usage:", error);
            throw error;
        }
    }
    async getTokenBreakdown(options = {}) {
        try {
            const { start_time, end_time } = this.calculateTimeRange(options.start_time, options.end_time);
            const breakdown = await this.db.getAggregatedData({
                agent_id: options.agent_id,
                start_time,
                end_time,
            });
            // Apply format-specific processing
            if (options.format === "summary") {
                return this.formatSummary(breakdown);
            }
            return breakdown;
        }
        catch (error) {
            console.error("Failed to get token breakdown:", error);
            throw error;
        }
    }
    async getCostRecommendations(options) {
        try {
            const { start_time, end_time } = this.calculateTimeRangeFromPeriod(options.time_period);
            const analysis = await this.analyzeCostPatterns({
                agent_id: options.agent_id,
                start_time,
                end_time,
            });
            const recommendations = [];
            // High cost tools
            analysis.high_cost_tools.slice(0, 5).forEach(tool => {
                recommendations.push({
                    type: "high_cost_tool",
                    priority: tool.total_cost > 10 ? "high" : "medium",
                    title: `High cost tool: ${tool.tool_name}`,
                    description: `Tool "${tool.tool_name}" is costing $${tool.total_cost.toFixed(4)} (${tool.call_count} calls)`,
                    impact: `Potential savings: $${(tool.total_cost * 0.3).toFixed(4)} with optimization`,
                    suggested_action: `Review prompts for ${tool.tool_name}, consider reducing frequency or caching results`,
                });
            });
            // Frequent tools
            analysis.frequent_tools.slice(0, 3).forEach(tool => {
                recommendations.push({
                    type: "frequent_tool",
                    priority: "medium",
                    title: `High frequency tool: ${tool.tool_name}`,
                    description: `Tool "${tool.tool_name}" is called ${tool.call_count} times, consuming ${tool.total_tokens.toLocaleString()} tokens`,
                    impact: `Caching could reduce token usage by 50-80%`,
                    suggested_action: `Implement result caching for ${tool.tool_name} where appropriate`,
                });
            });
            // Inefficient agents
            analysis.inefficient_agents.slice(0, 3).forEach(agent => {
                recommendations.push({
                    type: "inefficient_agent",
                    priority: "high",
                    title: `Inefficient agent: ${agent.agent_id}`,
                    description: `Agent "${agent.agent_id}" has low efficiency score (${agent.efficiency_score.toFixed(1)}%)`,
                    impact: `High token cost for output, potential prompt engineering issues`,
                    suggested_action: `Review context management and prompt engineering for ${agent.agent_id}`,
                });
            });
            // General optimization tips
            analysis.optimization_tips.forEach(tip => {
                recommendations.push({
                    type: "optimization_tip",
                    priority: "low",
                    title: "Optimization Tip",
                    description: tip,
                    impact: "Potential token and cost savings",
                    suggested_action: "Consider implementing this optimization",
                });
            });
            return recommendations;
        }
        catch (error) {
            console.error("Failed to get cost recommendations:", error);
            throw error;
        }
    }
    async getSystemStatus() {
        try {
            const [stats, dbStats] = await Promise.all([
                this.db.getSystemStats(),
                this.getDatabaseStats(),
            ]);
            const recommendations = await this.getCostRecommendations({
                time_period: "24h",
            });
            const costRecommendations = recommendations
                .filter(r => r.priority === "high")
                .map(r => r.title);
            return {
                total_calls: stats.total_calls,
                total_tokens: stats.total_tokens,
                total_cost: stats.total_cost,
                active_agents: stats.active_agents,
                cost_recommendations: costRecommendations,
                uptime_hours: this.getUptimeHours(),
                database_size_mb: dbStats.size_mb,
            };
        }
        catch (error) {
            console.error("Failed to get system status:", error);
            throw error;
        }
    }
    validateTokenRecord(record) {
        if (!record.agent_id || typeof record.agent_id !== "string") {
            throw new Error("Agent ID is required and must be a string");
        }
        if (!record.tool_name || typeof record.tool_name !== "string") {
            throw new Error("Tool name is required and must be a string");
        }
        if (record.input_tokens < 0 || record.output_tokens < 0) {
            throw new Error("Token counts cannot be negative");
        }
        if (record.cost_usd < 0) {
            throw new Error("Cost cannot be negative");
        }
        if (!record.timestamp || isNaN(Date.parse(record.timestamp))) {
            throw new Error("Valid timestamp is required");
        }
        if (!["completed", "error"].includes(record.status)) {
            throw new Error("Status must be 'completed' or 'error'");
        }
    }
    calculateTimeRange(start_time, end_time) {
        let startTime = start_time;
        let endTime = end_time || new Date().toISOString();
        if (!startTime) {
            // Default to 24 hours ago
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            startTime = twentyFourHoursAgo.toISOString();
        }
        return { start_time: startTime, end_time: endTime };
    }
    calculateTimeFromPeriod(period) {
        const now = new Date();
        let startTime;
        switch (period) {
            case "1h":
                startTime = new Date(Date.now() - 60 * 60 * 1000);
                break;
            case "24h":
                startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case "7d":
                startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        return {
            start_time: startTime.toISOString(),
            end_time: now.toISOString(),
        };
    }
    calculateTimeRangeFromPeriod(period) {
        return this.calculateTimeFromPeriod(period);
    }
    async analyzeCostPatterns(options) {
        const breakdown = await this.db.getAggregatedData(options);
        // Find high cost tools (more than $1 in total cost)
        const highCostTools = Object.entries(breakdown.by_tool)
            .map(([tool_name, data]) => ({
            tool_name,
            total_cost: data.total_cost,
            call_count: data.call_count,
            avg_cost_per_call: data.total_cost / data.call_count,
        }))
            .filter(tool => tool.total_cost > 1)
            .sort((a, b) => b.total_cost - a.total_cost);
        // Find frequent tools (more than 50 calls)
        const frequentTools = Object.entries(breakdown.by_tool)
            .map(([tool_name, data]) => ({
            tool_name,
            call_count: data.call_count,
            total_tokens: data.total_tokens,
            avg_tokens_per_call: data.avg_tokens_per_call,
        }))
            .filter(tool => tool.call_count > 50)
            .sort((a, b) => b.call_count - a.call_count);
        // Find inefficient agents (high cost per token)
        const inefficientAgents = Object.entries(breakdown.by_agent)
            .map(([agent_id, data]) => {
            const efficiencyScore = data.total_tokens > 0 ? (data.total_cost / data.total_tokens) * 10000 : 100;
            return {
                agent_id,
                total_cost: data.total_cost,
                total_tokens: data.total_tokens,
                avg_tokens_per_call: data.avg_tokens_per_call,
                efficiency_score: efficiencyScore,
            };
        })
            .filter(agent => agent.efficiency_score > 10) // High cost per token
            .sort((a, b) => b.efficiency_score - a.efficiency_score);
        // Generate optimization tips
        const optimizationTips = this.generateOptimizationTips(highCostTools, frequentTools, inefficientAgents);
        return {
            high_cost_tools: highCostTools,
            frequent_tools: frequentTools,
            inefficient_agents: inefficientAgents,
            optimization_tips: optimizationTips,
        };
    }
    generateOptimizationTips(highCostTools, frequentTools, inefficientAgents) {
        const tips = [];
        if (highCostTools.length > 0) {
            tips.push("Consider using shorter prompts or reducing context length for high-cost tools");
            tips.push("Implement caching for expensive operations that return similar results");
        }
        if (frequentTools.length > 0) {
            tips.push("Cache results from frequently called tools to reduce token usage");
            tips.push("Consider combining multiple tool calls into single requests where possible");
        }
        if (inefficientAgents.length > 0) {
            tips.push("Review prompt engineering for inefficient agents");
            tips.push("Consider using more specific prompts to reduce unnecessary context");
        }
        tips.push("Regular review of token usage patterns can identify optimization opportunities");
        tips.push("Set up alerts for unusual token cost spikes");
        return tips;
    }
    formatSummary(breakdown) {
        const summary = {
            ...breakdown.summary,
            cost_per_token_usd: breakdown.summary.total_tokens > 0
                ? breakdown.summary.total_cost / breakdown.summary.total_tokens
                : 0,
            cost_per_call_usd: breakdown.summary.total_calls > 0
                ? breakdown.summary.total_cost / breakdown.summary.total_calls
                : 0,
        };
        return {
            summary,
            top_agents: Object.entries(breakdown.by_agent)
                .sort(([, a], [, b]) => b.total_cost - a.total_cost)
                .slice(0, 5)
                .map(([agent, data]) => ({
                agent,
                cost: data.total_cost,
                calls: data.call_count,
                tokens: data.total_tokens,
            })),
            top_tools: Object.entries(breakdown.by_tool)
                .sort(([, a], [, b]) => b.total_cost - a.total_cost)
                .slice(0, 5)
                .map(([tool, data]) => ({
                tool,
                cost: data.total_cost,
                calls: data.call_count,
                tokens: data.total_tokens,
            })),
        };
    }
    async getDatabaseStats() {
        // This would need implementation based on the actual database
        // For now, return mock data
        return {
            size_mb: 1.5,
            record_count: 0,
        };
    }
    getUptimeHours() {
        // Mock uptime - in reality would track actual server start time
        return 24; // 24 hours uptime
    }
}
exports.TokenTracker = TokenTracker;
//# sourceMappingURL=tracker.js.map