#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const analyze_1 = require("./commands/analyze");
const init_1 = require("./commands/init");
const config_1 = require("./commands/config");
const report_1 = require("./commands/report");
const version_1 = require("./commands/version");
const program = new commander_1.Command();
program
    .name('ai-quality')
    .description('AI-powered code quality analyzer that goes beyond traditional linting')
    .version('1.0.0');
// Add commands
program.addCommand(analyze_1.AnalyzeCommand);
program.addCommand(init_1.InitCommand);
program.addCommand(config_1.ConfigCommand);
program.addCommand(report_1.ReportCommand);
program.addCommand(version_1.VersionCommand);
// Global options
program
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--silent', 'Silent mode (no output except errors)')
    .option('--ci', 'CI mode (machine-readable output)')
    .option('--config <path>', 'Path to configuration file');
// Error handling
program.configureOutput({
    writeErr: (str) => process.stderr.write(chalk_1.default.red(str)),
    outputError: (str, write) => write(chalk_1.default.red(`Error: ${str}`))
});
// Handle unknown commands
program.on('command:*', (operands) => {
    console.error(chalk_1.default.red(`Unknown command: ${operands[0]}`));
    console.log(chalk_1.default.yellow('Available commands:'));
    program.commands.forEach((cmd) => {
        if (cmd.name() !== 'help') {
            console.log(chalk_1.default.gray(`  ${cmd.name()}`));
        }
    });
    process.exit(1);
});
// Parse and run
program.parse();
//# sourceMappingURL=index.js.map