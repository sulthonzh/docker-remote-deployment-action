#!/usr/bin/env node
import { Command } from 'commander';
import { ConfigManager } from './core/config-manager';
import { reporters } from './reporters';
import { ProbeRunner } from './core/probe-runner';
import { AgentAdapter } from './adapters/agent-adapter';
import { SandboxAdapter } from './adapters/sandbox-adapter';
const program = new Command();
program
    .name('agent-sandbox-probe')
    .description('Automated test harness for AI coding agent sandbox security')
    .version('1.0.0');
program
    .command('probe')
    .description('Run probe tests against an agent sandbox')
    .option('-a, --agent <type>', 'Agent type to test', 'claude-code')
    .option('-s, --sandbox <type>', 'Sandbox type to test', 'enclave')
    .option('-c, --config <file>', 'Configuration file path', 'probes.yaml')
    .option('-f, --format <format>', 'Output format', 'console')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options) => {
    const configManager = new ConfigManager(options.config);
    const config = await configManager.load();
    // Create adapters
    const agentAdapter = AgentAdapter.create(options.agent);
    const sandboxAdapter = SandboxAdapter.create(options.sandbox);
    // Create probe runner and run probes
    const probeRunner = new ProbeRunner({
        agentType: options.agent,
        sandboxType: options.sandbox,
        timeout: config.settings.timeout,
        verbose: false,
        ci: false
    });
    const results = await probeRunner.runProbes(config.probes);
    const reporter = reporters[options.format] || reporters.console;
    await reporter.generate(results, options.output);
});
program
    .command('config')
    .description('Generate default configuration file')
    .option('-o, --output <file>', 'Output file path', 'probes.yaml')
    .action(async (options) => {
    const configManager = new ConfigManager(options.output);
    await configManager.generateDefault();
});
program.parse();
//# sourceMappingURL=index.js.map