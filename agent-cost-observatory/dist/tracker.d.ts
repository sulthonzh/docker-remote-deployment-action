import { DatabaseManager, TokenUsageRecord } from "./database";
export interface TokenBreakdownOptions {
    agent_id?: string;
    start_time?: string;
    end_time?: string;
    format?: "table" | "json" | "summary";
}
export interface CostRecommendation {
    type: "high_cost_tool" | "frequent_tool" | "inefficient_agent" | "optimization_tip";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    impact: string;
    suggested_action: string;
}
export interface CostAnalysis {
    high_cost_tools: Array<{
        tool_name: string;
        total_cost: number;
        call_count: number;
        avg_cost_per_call: number;
    }>;
    frequent_tools: Array<{
        tool_name: string;
        call_count: number;
        total_tokens: number;
        avg_tokens_per_call: number;
    }>;
    inefficient_agents: Array<{
        agent_id: string;
        total_cost: number;
        total_tokens: number;
        avg_tokens_per_call: number;
        efficiency_score: number;
    }>;
    optimization_tips: string[];
}
export interface SystemStatus {
    total_calls: number;
    total_tokens: number;
    total_cost: number;
    active_agents: number;
    cost_recommendations: string[];
    uptime_hours: number;
    database_size_mb: number;
}
export declare class TokenTracker {
    private db;
    constructor(db: DatabaseManager);
    trackTokenUsage(record: Omit<TokenUsageRecord, "id">): Promise<number>;
    getTokenBreakdown(options?: TokenBreakdownOptions): Promise<{
        by_agent: Record<string, any>;
        by_tool: Record<string, any>;
        summary: any;
    }>;
    getCostRecommendations(options: {
        agent_id?: string;
        time_period: string;
    }): Promise<CostRecommendation[]>;
    getSystemStatus(): Promise<SystemStatus>;
    private validateTokenRecord;
    private calculateTimeRange;
    private calculateTimeFromPeriod;
    private calculateTimeRangeFromPeriod;
    private analyzeCostPatterns;
    private generateOptimizationTips;
    private formatSummary;
    private getDatabaseStats;
    private getUptimeHours;
}
//# sourceMappingURL=tracker.d.ts.map