"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerAnalyzer = void 0;
const child_process_1 = require("child_process");
const { promisify } = require('util');
const execAsync = promisify(child_process_1.exec);
class DockerAnalyzer {
    async analyze(image) {
        const [sizeInfo, inspectInfo, historyInfo, packageInfo] = await Promise.all([
            this.getImageSize(image),
            this.inspectImage(image),
            this.getImageHistory(image),
            this.extractPackages(image)
        ]);
        return {
            image,
            size: sizeInfo.size,
            layers: historyInfo,
            packages: packageInfo,
            labels: inspectInfo.Config.Labels || {},
            environment: inspectInfo.Config.Env || {},
            created: inspectInfo.Created,
            architecture: inspectInfo.Architecture,
            os: inspectInfo.Os
        };
    }
    async getImageSize(image) {
        try {
            const { stdout } = await execAsync(`docker images ${image} --format "{{.Size}}" --no-trunc`);
            const sizeStr = stdout.trim();
            if (sizeStr.endsWith('GB')) {
                return { size: parseFloat(sizeStr) * 1024 * 1024 * 1024 };
            }
            else if (sizeStr.endsWith('MB')) {
                return { size: parseFloat(sizeStr) * 1024 * 1024 };
            }
            else if (sizeStr.endsWith('KB')) {
                return { size: parseFloat(sizeStr) * 1024 };
            }
            else if (sizeStr.endsWith('B')) {
                return { size: parseFloat(sizeStr) };
            }
            const sizeBytes = parseFloat(sizeStr);
            return { size: isNaN(sizeBytes) ? 0 : sizeBytes };
        }
        catch (error) {
            throw new Error(`Failed to get image size: ${error.message}`);
        }
    }
    async inspectImage(image) {
        try {
            const { stdout } = await execAsync(`docker inspect ${image}`);
            return JSON.parse(stdout)[0];
        }
        catch (error) {
            throw new Error(`Failed to inspect image: ${error.message}`);
        }
    }
    async getImageHistory(image) {
        try {
            const { stdout } = await execAsync(`docker history --no-trunc --format "{{.ID}}\t{{.Size}}\t{{.CreatedBy}}" ${image}`);
            const lines = stdout.trim().split('\n');
            return lines.map((line, index) => {
                const [id, sizeStr, createdBy] = line.split('\t');
                const commands = createdBy ? this.parseCreatedBy(createdBy) : [];
                return {
                    id,
                    size: this.parseSize(sizeStr),
                    commands,
                    diffSize: index === 0 ? 0 : this.parseSize(lines[index - 1]?.split('\t')[1] || '0'),
                    created: new Date(Date.now() - index * 86400000).toISOString()
                };
            }).filter(layer => layer.id && layer.size > 0);
        }
        catch (error) {
            throw new Error(`Failed to get image history: ${error.message}`);
        }
    }
    async extractPackages(image) {
        try {
            const packages = [];
            try {
                const { stdout } = await execAsync(`docker run --rm ${image} dpkg-query -W 2>/dev/null || echo "No dpkg"`);
                if (stdout !== 'No dpkg\n') {
                    const debPackages = this.parseDpkgOutput(stdout);
                    packages.push(...debPackages);
                }
            }
            catch (error) {
            }
            try {
                const { stdout } = await execAsync(`docker run --rm ${image} rpm -qa --queryformat '%{NAME}\t%{VERSION}\t%{SIZE}\n' 2>/dev/null || echo "No rpm"`);
                if (stdout !== 'No rpm\n') {
                    const rpmPackages = this.parseRpmOutput(stdout);
                    packages.push(...rpmPackages);
                }
            }
            catch (error) {
            }
            try {
                const { stdout } = await execAsync(`docker run --rm ${image} pip list --format=freeze 2>/dev/null || echo "No pip"`);
                if (stdout !== 'No pip\n') {
                    const pipPackages = this.parsePipOutput(stdout);
                    packages.push(...pipPackages);
                }
            }
            catch (error) {
            }
            try {
                const { stdout } = await execAsync(`docker run --rm ${image} npm list --depth=0 --json 2>/dev/null || echo "No npm"`);
                if (stdout !== 'No npm\n' && stdout !== '{}') {
                    const npmPackages = this.parseNpmOutput(stdout);
                    packages.push(...npmPackages);
                }
            }
            catch (error) {
            }
            return packages;
        }
        catch (error) {
            throw new Error(`Failed to extract packages: ${error.message}`);
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
    parseSize(sizeStr) {
        if (!sizeStr || sizeStr === '0')
            return 0;
        const cleanStr = sizeStr.trim();
        if (cleanStr.endsWith('GB')) {
            return parseFloat(cleanStr) * 1024 * 1024 * 1024;
        }
        else if (cleanStr.endsWith('MB')) {
            return parseFloat(cleanStr) * 1024 * 1024;
        }
        else if (cleanStr.endsWith('KB')) {
            return parseFloat(cleanStr) * 1024;
        }
        else if (cleanStr.endsWith('B')) {
            return parseFloat(cleanStr);
        }
        const sizeBytes = parseFloat(cleanStr);
        return isNaN(sizeBytes) ? 0 : sizeBytes;
    }
    parseDpkgOutput(output) {
        return output.split('\n')
            .filter(line => line && line.trim())
            .map(line => {
            const [name, version] = line.split('\t');
            return {
                name: name || line,
                version: version || 'unknown',
                category: 'deb'
            };
        });
    }
    parseRpmOutput(output) {
        return output.split('\n')
            .filter(line => line && line.trim())
            .map(line => {
            const [name, version, size] = line.split('\t');
            return {
                name: name || line,
                version: version || 'unknown',
                size: size ? parseInt(size) : undefined,
                category: 'rpm'
            };
        });
    }
    parsePipOutput(output) {
        return output.split('\n')
            .filter(line => line && line.trim())
            .map(line => {
            const [name, version] = line.split('==');
            return {
                name: name || line,
                version: version || 'unknown',
                category: 'pip'
            };
        });
    }
    parseNpmOutput(output) {
        try {
            const data = JSON.parse(output);
            const packages = [];
            Object.entries(data.dependencies || {}).forEach(([name, info]) => {
                packages.push({
                    name,
                    version: info.version || 'unknown',
                    category: 'npm'
                });
            });
            return packages;
        }
        catch (error) {
            return [];
        }
    }
}
exports.DockerAnalyzer = DockerAnalyzer;
//# sourceMappingURL=DockerAnalyzer.js.map