import { Command } from 'commander';
import { WorkflowOrchestrator } from '../core/orchestrator';
export declare class AgentCommand {
    private orchestrator;
    private logger;
    constructor(orchestrator: WorkflowOrchestrator);
    registerCommands(program: Command): void;
    private createAgentListCommand;
    private createAgentCreateCommand;
    private createAgentUpdateCommand;
    private createAgentDeleteCommand;
    private createAgentShowCommand;
    private createAgentTestCommand;
    private parseAgentFromData;
    private generateAgentId;
    private promptConfirmation;
}
//# sourceMappingURL=agent-command.d.ts.map