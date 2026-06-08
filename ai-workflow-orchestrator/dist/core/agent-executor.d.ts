import { AgentConfig } from '../types';
export interface AgentResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
}
export declare class AgentExecutor {
    private agents;
    private logger;
    private initialized;
    constructor(agents: AgentConfig[]);
    initialize(): Promise<void>;
    executeAgent(agentConfig: AgentConfig, input: Record<string, any>): Promise<AgentResult>;
    getAgentCapabilities(agentId: string): Promise<string[]>;
    listAgents(): Promise<AgentConfig[]>;
    getAgent(agentId: string): Promise<AgentConfig | null>;
    addAgent(agent: AgentConfig): Promise<void>;
    updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<void>;
    removeAgent(agentId: string): Promise<void>;
    cleanup(): Promise<void>;
    private validateAgentConfig;
    private executeOpenAI;
    private executeClaude;
    private executeLocal;
    private executeCustom;
}
//# sourceMappingURL=agent-executor.d.ts.map