export interface TokenUsage {
    input: number;
    output: number;
    total: number;
    timestamp: number;
    model: string;
}
export interface ToolCallMetrics {
    toolName: string;
    callCount: number;
    totalTokens: number;
    avgTokens: number;
    totalCost: number;
    lastCalled: number;
    tokenUsage: TokenUsage[];
}
export interface AgentMetrics {
    agentName: string;
    toolCalls: ToolCallMetrics[];
    totalTokens: number;
    totalCost: number;
    sessionTokens: TokenUsage[];
    startTime: number;
    endTime?: number;
}
export interface ObservatoryConfig {
    databasePath: string;
    models: ModelConfig[];
    pricing: ModelPricing;
    reportInterval: number;
    maxHistoryDays: number;
}
export interface ModelConfig {
    name: string;
    tokenizer: string;
    costPer1kInput: number;
    costPer1kOutput: number;
}
export interface ModelPricing {
    [modelName: string]: {
        input: number;
        output: number;
    };
}
export interface ObservatoryReport {
    period: {
        start: number;
        end: number;
    };
    summary: {
        totalTokens: number;
        totalCost: number;
        avgTokensPerSession: number;
        mostExpensiveTool: string;
        mostUsedTool: string;
    };
    agents: AgentMetrics[];
    recommendations: string[];
}
//# sourceMappingURL=types.d.ts.map