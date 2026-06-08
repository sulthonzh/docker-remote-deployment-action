"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SizeAnalyzer = void 0;
const child_process_1 = require("child_process");
const { promisify } = require('util');
const execAsync = promisify(child_process_1.exec);
class SizeAnalyzer {
    async analyze(image) {
        const [totalSize, layerSizes, fileSizes] = await Promise.all([
            this.getImageSize(image),
            this.getLayerSizes(image),
            this.getFileSizes(image)
        ]);
        const largestFiles = this.getLargestFiles(fileSizes);
        const sizeDistribution = this.analyzeSizeDistribution(fileSizes);
        return {
            image,
            totalSize,
            layerSizes,
            largestFiles,
            sizeDistribution
        };
    }
    async getImageSize(image) {
        try {
            const { stdout } = await execAsync(`docker images ${image} --format "{{.Size}}" --no-trunc`);
            const sizeStr = stdout.trim();
            return this.parseHumanReadableSize(sizeStr);
        }
        catch (error) {
            throw new Error(`Failed to get image size: ${error.message}`);
        }
    }
    async getLayerSizes(image) {
        try {
            const { stdout } = await execAsync(`docker history --no-trunc --format "{{.ID}}\t{{.Size}}\t{{.CreatedBy}}" ${image}`);
            const lines = stdout.trim().split('\n');
            return lines.map((line) => {
                const [id, sizeStr, createdBy] = line.split('\t');
                const commands = createdBy ? this.parseCreatedBy(createdBy) : [];
                return {
                    id,
                    size: this.parseHumanReadableSize(sizeStr),
                    commands
                };
            }).filter(layer => layer.id && layer.size > 0);
        }
        catch (error) {
            throw new Error(`Failed to get layer sizes: ${error.message}`);
        }
    }
    async getFileSizes(image) {
        const files = [];
        try {
            const containerId = await this.createTemporaryContainer(image);
            try {
                const { stdout } = await execAsync(`docker exec ${containerId} find / -type f -exec du -b {} \\; 2>/dev/null || echo "No files found"`);
                if (stdout.trim() !== 'No files found') {
                    const lines = stdout.trim().split('\n');
                    lines.forEach(line => {
                        const [sizeStr, path] = line.split('\t');
                        if (sizeStr && path) {
                            files.push({
                                path,
                                size: parseInt(sizeStr)
                            });
                        }
                    });
                }
                await this.addLayerFileInfo(containerId, files);
            }
            finally {
                await execAsync(`docker rm -f ${containerId}`).catch(() => {
                });
            }
        }
        catch (error) {
            console.warn(`File size analysis failed: ${error.message}`);
        }
        return files;
    }
    async createTemporaryContainer(image) {
        try {
            const { stdout } = await execAsync(`docker create --entrypoint /bin/sh ${image}`);
            return stdout.trim();
        }
        catch (error) {
            throw new Error(`Failed to create temporary container: ${error.message}`);
        }
    }
    async addLayerFileInfo(containerId, files) {
        try {
            const { stdout: diffOutput } = await execAsync(`docker diff ${containerId}`);
            const changedFiles = diffOutput.trim().split('\n').filter(line => line.startsWith('A') || line.startsWith('M'));
            changedFiles.forEach(line => {
                const fileOp = line.charAt(0);
                const filePath = line.substring(2);
                files.push({
                    path: filePath,
                    size: 0,
                    layerId: 'unknown'
                });
            });
        }
        catch (error) {
        }
    }
    parseCreatedBy(createdBy) {
        return createdBy
            .split(' /bin/sh -c ')
            .slice(1)
            .map(cmd => cmd.replace(/^(#( ?)|)/, ''))
            .filter(cmd => cmd.length > 0)
            .map(cmd => {
            return cmd.length > 50 ? cmd.substring(0, 47) + '...' : cmd;
        });
    }
    parseHumanReadableSize(sizeStr) {
        if (!sizeStr || sizeStr === '0')
            return 0;
        const cleanStr = sizeStr.trim();
        const multiplier = cleanStr.toUpperCase().includes('GB') ? 1024 * 1024 * 1024 :
            cleanStr.toUpperCase().includes('MB') ? 1024 * 1024 :
                cleanStr.toUpperCase().includes('KB') ? 1024 :
                    1;
        const numericValue = parseFloat(cleanStr.replace(/[^\d.]/g, ''));
        return isNaN(numericValue) ? 0 : Math.round(numericValue * multiplier);
    }
    getLargestFiles(files, limit = 20) {
        return files
            .sort((a, b) => b.size - a.size)
            .slice(0, limit)
            .map(file => ({
            path: file.path,
            size: file.size,
            layerId: file.layerId
        }));
    }
    analyzeSizeDistribution(files) {
        const distribution = {
            small: 0,
            medium: 0,
            large: 0,
            huge: 0
        };
        files.forEach(file => {
            if (file.size < 1024) {
                distribution.small++;
            }
            else if (file.size < 1024 * 1024) {
                distribution.medium++;
            }
            else if (file.size < 100 * 1024 * 1024) {
                distribution.large++;
            }
            else {
                distribution.huge++;
            }
        });
        return distribution;
    }
    formatSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
        const sizeValue = bytes / Math.pow(1024, sizeIndex);
        return `${sizeValue.toFixed(2)} ${units[sizeIndex]}`;
    }
}
exports.SizeAnalyzer = SizeAnalyzer;
//# sourceMappingURL=SizeAnalyzer.js.map