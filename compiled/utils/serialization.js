import { availableProbes } from '../probes';
export class SerializationUtils {
    static generateProbeConfig() {
        // Generate config with plain object probes
        return availableProbes.map(probe => ({
            id: probe.id,
            name: probe.name,
            category: probe.category,
            severity: probe.severity,
            description: probe.description,
            setup: probe.setup,
            expectedResult: probe.expectedResult
        }));
    }
    static loadProbeClasses() {
        // Return actual probe classes for runtime
        return availableProbes;
    }
}
//# sourceMappingURL=serialization.js.map