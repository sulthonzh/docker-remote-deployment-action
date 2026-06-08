import { Command } from 'commander';
import { WorkflowOrchestrator } from '../core/orchestrator';
export declare class WorkflowBuilder {
    private orchestrator;
    private logger;
    constructor(orchestrator: WorkflowOrchestrator);
    registerCommands(program: Command): void;
    private createWorkflowListCommand;
    private createWorkflowCreateCommand;
    private createWorkflowUpdateCommand;
    private createWorkflowDeleteCommand;
    private createWorkflowShowCommand;
    private createWorkflowImportCommand;
    private createWorkflowExportCommand;
    private parseWorkflowFromData;
    private createWorkflowFromTemplate;
    private promptConfirmation;
}
//# sourceMappingURL=workflow-builder.d.ts.map