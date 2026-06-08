export interface LayerInfo {
    id: string;
    size: number;
    commands: string[];
    diffSize: number;
    created: string;
    parent?: string;
    labels?: Record<string, string>;
}
export interface LayerAnalysis {
    image: string;
    totalLayers: number;
    totalSize: number;
    layers: LayerInfo[];
    layerDistribution: {
        small: number;
        medium: number;
        large: number;
        huge: number;
    };
    buildTimes: Array<{
        layerId: string;
        time: number;
        commands: string[];
    }>;
}
export declare class LayerAnalyzer {
    analyze(image: string): Promise<LayerAnalysis>;
    getImageInfo(image: string): Promise<any>;
    getImageHistory(image: string): Promise<LayerInfo[]>;
    getImageManifest(image: string): Promise<any>;
    parseCreatedBy(createdBy: string): string[];
    parseSize(sizeStr: string): number;
    parseCreatedDate(createdStr: string): string;
    analyzeLayerDistribution(layers: LayerInfo[]): {
        small: number;
        medium: number;
        large: number;
        huge: number;
    };
    analyzeBuildTimes(layers: LayerInfo[]): Array<{
        layerId: string;
        time: number;
        commands: string[];
    }>;
    analyzeOptimization(layers: LayerInfo[]): {
        opportunities: Array<{
            layerId: string;
            issue: string;
            suggestion: string;
            potentialSavings: number;
        }>;
        recommendations: string[];
    };
    findConsecutiveCopyLayers(layers: LayerInfo[]): LayerInfo[];
    formatSize(bytes: number): string;
}
//# sourceMappingURL=LayerAnalyzer.d.ts.map