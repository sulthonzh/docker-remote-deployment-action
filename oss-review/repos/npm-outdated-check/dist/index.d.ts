interface PackageInfo {
    name: string;
    current: string;
    latest: string;
    wanted: string;
    type: 'prod' | 'dev';
    direct: boolean;
}
interface VersionDiff {
    name: string;
    current: string;
    latest: string;
    type: 'prod' | 'dev';
    majorDiff: number;
    minorDiff: number;
    patchDiff: number;
    isViolation: boolean;
}
interface Config {
    maxMajor: number;
    maxMinor: number;
    maxPatch: number;
    include: ('prod' | 'dev')[];
    exclude: string[];
    registry: string;
    format: 'text' | 'json' | 'table';
    failOnAny: boolean;
    verbose: boolean;
}
interface CheckResult {
    violations: VersionDiff[];
    totalChecked: number;
    passed: boolean;
    config: Config;
}
interface NpmPackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}
interface NpmRegistryInfo {
    name: string;
    'dist-tags': {
        latest: string;
    };
    versions: Record<string, unknown>;
}
type ExitCode = 0 | 1 | 2 | 3;

declare class OutdatedChecker {
    private config;
    private basePath;
    constructor(config: Config, basePath?: string);
    check(): Promise<{
        violations: VersionDiff[];
        totalChecked: number;
    }>;
    private readPackageJson;
    private getPackageInfo;
    private getLatestVersion;
    private calculateVersionDiff;
    private isExcluded;
    getExitCode(violations: VersionDiff[]): ExitCode;
}

declare class Formatter {
    private config;
    constructor(config: Config);
    format(result: CheckResult): string;
    private formatJson;
    private formatTable;
    private formatText;
    formatVerbose(result: CheckResult): string;
}

declare class ConfigLoader {
    static load(configPath?: string): Promise<Config>;
    static mergeWithCli(config: Config, cliOptions: Partial<Config>): Config;
    static validate(config: Config): {
        valid: boolean;
        errors: string[];
    };
}

export { type CheckResult, type Config, ConfigLoader, type ExitCode, Formatter, type NpmPackageJson, type NpmRegistryInfo, OutdatedChecker, type PackageInfo, type VersionDiff };
