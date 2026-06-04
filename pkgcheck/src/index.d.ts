export interface CheckResult {
    name: string;
    passed: boolean;
    message: string;
    severity: "error" | "warning" | "info";
    fix?: string;
}
export interface CheckOptions {
    pkgPath?: string;
    strict?: boolean;
    json?: boolean;
    quiet?: boolean;
}
export declare function runChecks(options?: CheckOptions): CheckResult[];
export declare function formatResults(results: CheckResult[], options?: CheckOptions): string;
//# sourceMappingURL=index.d.ts.map