export declare class MCPObservatoryServer {
    private server;
    private db;
    private activeAgents;
    constructor(databasePath: string);
    private setupHandlers;
    private handleObserveAgent;
    private handleGenerateReport;
    private handleGetRecommendations;
    private generateRecommendations;
    private calculateCost;
    start(): Promise<void>;
    stop(): void;
}
//# sourceMappingURL=mcp-server.d.ts.map