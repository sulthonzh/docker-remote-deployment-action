export interface Vulnerability {
    id: string;
    package: string;
    version: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    cve?: string;
    url?: string;
    fixedIn?: string;
}
export interface SecurityScanResult {
    image: string;
    vulnerabilities: Record<string, Vulnerability[]>;
    scannedAt: string;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
    };
}
export declare class SecurityScanner {
    scan(image: string, options?: {
        severity?: string;
        exclude?: string;
    }): Promise<SecurityScanResult>;
    scanWithTrivy(image: string, vulnerabilities: Record<string, Vulnerability[]>, severities: string[], excludePackages: string[]): Promise<void>;
    scanWithGrype(image: string, vulnerabilities: Record<string, Vulnerability[]>, severities: string[], excludePackages: string[]): Promise<void>;
    fallbackVulnerabilityScan(image: string, vulnerabilities: Record<string, Vulnerability[]>, severities: string[], excludePackages: string[]): Promise<void>;
    extractPackageInfo(image: string): Promise<Array<{
        name: string;
        version: string;
    }>>;
    extractDebPackages(output: string): Array<{
        name: string;
        version: string;
    }>;
    extractRpmPackages(output: string): Array<{
        name: string;
        version: string;
    }>;
    extractPipPackages(output: string): Array<{
        name: string;
        version: string;
    }>;
    extractNpmPackages(output: string): Array<{
        name: string;
        version: string;
    }>;
    checkKnownVulnerabilities(pkg: {
        name: string;
        version: string;
    }): Vulnerability[];
    checkOutdatedPackages(image: string): Promise<Array<{
        name: string;
        version: string;
        latestVersion: string;
    }>>;
}
//# sourceMappingURL=SecurityScanner.d.ts.map