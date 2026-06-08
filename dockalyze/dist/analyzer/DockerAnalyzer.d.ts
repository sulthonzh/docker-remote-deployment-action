export interface ImageAnalysis {
    image: string;
    size: number;
    layers: LayerInfo[];
    packages: PackageInfo[];
    labels: Record<string, string>;
    environment: Record<string, string>;
    created: string;
    architecture: string;
    os: string;
}
export interface LayerInfo {
    id: string;
    size: number;
    commands: string[];
    diffSize: number;
    created: string;
}
export interface PackageInfo {
    name: string;
    version: string;
    size?: number;
    description?: string;
    category?: string;
}
export declare class DockerAnalyzer {
    analyze(image: string): Promise<ImageAnalysis>;
    getImageSize(image: string): Promise<{
        size: number;
    }>;
    inspectImage(image: string): Promise<any>;
    getImageHistory(image: string): Promise<LayerInfo[]>;
    extractPackages(image: string): Promise<PackageInfo[]>;
    parseCreatedBy(createdBy: string): string[];
    parseSize(sizeStr: string): number;
    parseDpkgOutput(output: string): PackageInfo[];
    parseRpmOutput(output: string): PackageInfo[];
    parsePipOutput(output: string): PackageInfo[];
    parseNpmOutput(output: string): PackageInfo[];
}
//# sourceMappingURL=DockerAnalyzer.d.ts.map