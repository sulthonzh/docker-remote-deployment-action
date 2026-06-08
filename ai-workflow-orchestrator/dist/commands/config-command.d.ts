import { Command } from 'commander';
import { WorkflowOrchestrator } from '../core/orchestrator';
export declare class ConfigCommand {
    private orchestrator;
    private logger;
    constructor(orchestrator: WorkflowOrchestrator);
    registerCommands(program: Command): void;
    private createConfigShowCommand;
    private createConfigValidateCommand;
    private createConfigBackupCommand;
    private createConfigRestoreCommand;
    private createConfigResetCommand;
    private createConfigExportCommand;
    private createConfigImportCommand;
    private getConfig;
    private saveConfig;
    private validateConfiguration;
    private mergeConfigurations;
    private getDefaultConfig;
    private promptConfirmation;
}
//# sourceMappingURL=config-command.d.ts.map