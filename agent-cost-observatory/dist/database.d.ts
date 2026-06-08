export interface TokenUsageRecord {
    id?: number;
    agent_id: string;
    tool_name: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
    timestamp: string;
    duration_ms: number;
    status: "completed" | "error";
    error_message?: string;
}
export interface DatabaseConfig {
    dbPath: string;
}
export declare class DatabaseManager {
    private db;
    private config;
    constructor(config?: Partial<DatabaseConfig>);
    initialize(): Promise<void>;
    private createTables;
    private createIndexes;
    insertTokenUsage(record: Omit<TokenUsageRecord, "id">): Promise<number>;
    getTokenUsage(filters: {
        agent_id?: string;
        tool_name?: string;
        start_time?: string;
        end_time?: string;
        limit?: number;
        offset?: number;
    }): Promise<TokenUsageRecord[]>;
    getAggregatedData(filters: {
        agent_id?: string;
        tool_name?: string;
        start_time?: string;
        end_time?: string;
    }): Promise<{
        by_agent: Record<string, {
            call_count: number;
            total_tokens: number;
            total_cost: number;
            avg_tokens_per_call: number;
        }>;
        by_tool: Record<string, {
            call_count: number;
            total_tokens: number;
            total_cost: number;
            avg_tokens_per_call: number;
        }>;
        summary: {
            total_calls: number;
            total_tokens: number;
            total_cost: number;
            avg_tokens_per_call: number;
        };
    }>;
    getSystemStats(): Promise<{
        total_calls: number;
        total_tokens: number;
        total_cost: number;
        active_agents: number;
        error_rate: number;
    }>;
    reset(): Promise<void>;
    close(): void;
}
//# sourceMappingURL=database.d.ts.map