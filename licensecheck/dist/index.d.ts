export interface LicenseEntry {
    name: string;
    version: string;
    license: string | null;
    licenseFile: string | null;
    repository: string | null;
    path: string;
}
export interface LicenseCategory {
    permissive: string[];
    copyleft: string[];
    weakCopyleft: string[];
    proprietary: string[];
    publicDomain: string[];
    unknown: string[];
}
export interface PolicyRule {
    allow: string[];
    deny: string[];
    warn: string[];
}
export interface ScanResult {
    entries: LicenseEntry[];
    stats: {
        total: number;
        licensed: number;
        unlicensed: number;
    };
    categories: Record<string, LicenseEntry[]>;
    violations: Violation[];
}
export interface Violation {
    package: string;
    version: string;
    license: string | null;
    severity: "error" | "warning";
    reason: string;
}
export declare function scan(cwd?: string): ScanResult;
export declare function checkPolicy(result: ScanResult, policy: PolicyRule): Violation[];
export declare function formatTable(result: ScanResult): string;
export declare function formatViolations(violations: Violation[]): string;
export declare function formatJson(result: ScanResult, violations?: Violation[]): string;
export declare function formatMarkdown(result: ScanResult, violations?: Violation[]): string;
