export interface LayerSize {
    id: string;
    size: number;
    commands?: string[];
}
export interface SizeAnalysis {
    image: string;
    totalSize: number;
    layerSizes: LayerSize[];
    largestFiles: Array<{
        path: string;
        size: number;
        layerId?: string;
    }>;
    sizeDistribution: {
        small: number;
        medium: number;
        large: number;
        huge: number;
    };
}
export declare class SizeAnalyzer {
    analyze(image: string): Promise<SizeAnalysis>;
    getImageSize(image: string): Promise<number>;
    getLayerSizes(image: string): Promise<LayerSize[]>;
    getFileSizes(image: string): Promise<Array<{
        path: string;
        size: number;
        layerId?: string;
    }>>;
    createTemporaryContainer(image: string): Promise<string>;
    addLayerFileInfo(containerId: string, files: Array<{
        path: string;
        size: number;
        layerId?: string;
    }>): Promise<void>;
    parseCreatedBy(createdBy: string): string[];
    parseHumanReadableSize(sizeStr: string): number;
    getLargestFiles(files: Array<{
        path: string;
        size: number;
        layerId?: string;
    }>, limit?: number): Array<{
        path: string;
        size: number;
        layerId?: string;
    }>;
    analyzeSizeDistribution(files: Array<{
        path: string;
        size: number;
    }>): {
        small: number;
        medium: number;
        large: number;
        huge: number;
    };
    formatSize(bytes: number): string;
}
//# sourceMappingURL=SizeAnalyzer.d.ts.map