import { AgentAdapter } from '../adapters/agent-adapter';
import { SandboxAdapter } from '../adapters/sandbox-adapter';
import { Logger } from '../utils/logger';
import { availableProbes } from '../probes';
export class ProbeRunner {
    constructor(config) {
        this.config = config;
        this.logger = new Logger();
        this.agentAdapter = AgentAdapter.create(config.agentType);
        this.sandboxAdapter = SandboxAdapter.create(config.sandboxType);
    }
    async runProbes(probeConfigs) {
        // Find matching probes from our available probes
        const probes = availableProbes.filter(probe => probeConfigs.some(config => config.id === probe.id));
        if (probes.length === 0) {
            this.logger.warn('No matching probes found for the configuration');
            return [];
        }
        const results = [];
        for (const probe of probes) {
            this.logger.info(`Running probe: ${probe.name}`);
            try {
                const result = await this.runSingleProbe(probe);
                results.push(result);
                if (this.config.verbose) {
                    this.logger.debug(`Probe ${probe.name} result: ${result.status}`);
                }
            }
            catch (error) {
                results.push({
                    id: probe.id,
                    name: probe.name,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration: 0,
                    timestamp: new Date().toISOString()
                });
                this.logger.error(`Probe ${probe.name} failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return results;
    }
    async runSingleProbe(probe) {
        const startTime = Date.now();
        try {
            // Initialize sandbox
            await this.sandboxAdapter.initialize();
            // Prepare probe environment
            await this.sandboxAdapter.setupProbeEnvironment(probe.setup);
            // Execute the probe
            const probeResult = await probe.execute(this.agentAdapter, this.sandboxAdapter);
            // Validate the result
            const isValid = await this.validateProbeResult(probe, probeResult);
            return {
                id: probe.id,
                name: probe.name,
                status: isValid ? 'passed' : 'failed',
                evidence: probeResult.evidence,
                error: isValid ? undefined : 'Probe validation failed',
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                id: probe.id,
                name: probe.name,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
        finally {
            // Cleanup
            await this.sandboxAdapter.cleanupProbeEnvironment();
        }
    }
    async validateProbeResult(probe, result) {
        // Basic validation logic - each probe should implement its own validation
        if (probe.expectedResult) {
            return result.status === probe.expectedResult;
        }
        // Default: check if result indicates no escape
        return result.status === 'safe';
    }
}
//# sourceMappingURL=probe-runner.js.map