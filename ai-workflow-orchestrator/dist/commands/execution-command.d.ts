import { Command } from 'commander';
import { WorkflowOrchestrator } from '../core/orchestrator';
export declare class ExecutionCommand {
    private orchestrator;
    private logger;
    constructor(orchestrator: WorkflowOrchestrator);
    registerCommands(program: Command): void;
    private createExecuteCommand;
    private createExecuteListCommand;
    private createExecuteShowCommand;
    private createExecutePauseCommand;
    private createExecuteResumeCommand;
    private createExecuteStopCommand;
    private createExecuteCleanupCommand;
    private createExecuteStatsCommand;
    private executeWithWatch;
    private getStatusIcon;
    private promptConfirmation;
}
//# sourceMappingURL=execution-command.d.ts.map