export interface PackageTree {
    name: string;
    version: string;
    dependencies?: PackageTree[];
    size?: number;
    category?: string;
}
export interface PackageResult {
    image: string;
    packages: Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    tree?: PackageTree;
}
export declare class PackageManager {
    getPackages(image: string, options?: {
        tree?: boolean;
        depth?: number;
        filter?: string;
    }): Promise<PackageResult>;
    extractPackages(image: string): Promise<Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>>;
    extractDebianPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractRpmPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractPythonPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractNodePackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractGoPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractRustPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    extractJavaPackages(output: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    tryPackageSpecificCommands(image: string, packages: Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>): Promise<void>;
    parsePackageOutput(output: string, category: string): Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>;
    buildPackageTree(packages: Array<{
        name: string;
        version: string;
        size?: number;
        category?: string;
    }>): PackageTree;
    limitTreeDepth(tree: PackageTree, depth: number): void;
}
//# sourceMappingURL=PackageManager.d.ts.map