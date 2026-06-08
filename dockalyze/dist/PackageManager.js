"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManager = void 0;
const child_process_1 = require("child_process");
const { promisify } = require('util');
const execAsync = promisify(child_process_1.exec);
class PackageManager {
    async getPackages(image, options = {}) {
        const { tree = false, depth = 2, filter } = options;
        const packages = await this.extractPackages(image);
        let result = {
            image,
            packages
        };
        if (tree) {
            result.tree = this.buildPackageTree(packages);
            this.limitTreeDepth(result.tree, depth);
        }
        if (filter) {
            result.packages = packages.filter(pkg => pkg.name.toLowerCase().includes(filter.toLowerCase()));
        }
        return result;
    }
    async extractPackages(image) {
        const packages = [];
        try {
            const { stdout: containerOutput } = await execAsync(`docker run --rm ${image} 2>&1 || echo "Container exited"`);
            packages.push(...this.extractDebianPackages(containerOutput));
            packages.push(...this.extractRpmPackages(containerOutput));
            packages.push(...this.extractPythonPackages(containerOutput));
            packages.push(...this.extractNodePackages(containerOutput));
            packages.push(...this.extractGoPackages(containerOutput));
            packages.push(...this.extractRustPackages(containerOutput));
            packages.push(...this.extractJavaPackages(containerOutput));
            if (packages.length === 0) {
                await this.tryPackageSpecificCommands(image, packages);
            }
        }
        catch (error) {
            console.warn(`Package extraction failed: ${error.message}`);
        }
        return packages;
    }
    extractDebianPackages(output) {
        const packages = [];
        const dpkgPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-.]*)\t([0-9][0-9a-zA-Z.:+~-]*)/gm;
        let match;
        while ((match = dpkgPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'deb'
            });
        }
        const aptPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-.]*)\s+\[([^\]]+)\]\s+([0-9][0-9a-zA-Z.:+~-]*)/gm;
        while ((match = aptPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'apt'
            });
        }
        return packages;
    }
    extractRpmPackages(output) {
        const packages = [];
        const rpmPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-_]*)-([0-9][0-9a-zA-Z.~_-]*)/gm;
        let match;
        while ((match = rpmPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'rpm'
            });
        }
        const yumPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-_\.]+)\.\w+\s+([0-9][0-9a-zA-Z.~_-]*)/gm;
        while ((match = yumPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'yum'
            });
        }
        return packages;
    }
    extractPythonPackages(output) {
        const packages = [];
        const pipPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-_\.]*)\s+([0-9][0-9a-zA-Z.~_+-]*)/gm;
        let match;
        while ((match = pipPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'pip'
            });
        }
        return packages;
    }
    extractNodePackages(output) {
        const packages = [];
        const packageJsonPattern = /"([a-zA-Z0-9][a-zA-Z0-9+\-_\.]*)"\s*:\s*"([0-9][0-9a-zA-Z.~_+-]*)"/gm;
        let match;
        while ((match = packageJsonPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'npm'
            });
        }
        return packages;
    }
    extractGoPackages(output) {
        const packages = [];
        const goModPattern = /^([a-zA-Z0-9][a-zA-Z0-9\/\._-]+)\s+([0-9][0-9a-zA-Z.~_+-]*)$/gm;
        let match;
        while ((match = goModPattern.exec(output)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
                category: 'go'
            });
        }
        return packages;
    }
    extractRustPackages(output) {
        return [];
    }
    extractJavaPackages(output) {
        return [];
    }
    async tryPackageSpecificCommands(image, packages) {
        const commands = [
            { cmd: 'dpkg-query -W', category: 'deb' },
            { cmd: 'rpm -qa --queryformat "%{NAME}\t%{VERSION}\n"', category: 'rpm' },
            { cmd: 'pip list --format=freeze', category: 'pip' },
            { cmd: 'npm list --depth=0 --json', category: 'npm' },
            { cmd: 'go list -m all', category: 'go' }
        ];
        for (const { cmd, category } of commands) {
            try {
                const { stdout } = await execAsync(`docker run --rm ${image} ${cmd} 2>/dev/null || echo "No ${category}"`);
                if (stdout.trim() !== `No ${category}`) {
                    const extracted = this.parsePackageOutput(stdout, category);
                    packages.push(...extracted);
                }
            }
            catch (error) {
            }
        }
    }
    parsePackageOutput(output, category) {
        const packages = [];
        switch (category) {
            case 'deb':
                const debPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-.]*)\t([0-9][0-9a-zA-Z.:+~-]*)/gm;
                let match;
                while ((match = debPattern.exec(output)) !== null) {
                    packages.push({
                        name: match[1],
                        version: match[2],
                        category
                    });
                }
                break;
            case 'rpm':
                const rpmPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-_]*)\t([0-9][0-9a-zA-Z.~_-]*)/gm;
                while ((match = rpmPattern.exec(output)) !== null) {
                    packages.push({
                        name: match[1],
                        version: match[2],
                        category
                    });
                }
                break;
            case 'pip':
                const pipPattern = /^([a-zA-Z0-9][a-zA-Z0-9+\-_\.]*)==([0-9][0-9a-zA-Z.~_+-]*)/gm;
                while ((match = pipPattern.exec(output)) !== null) {
                    packages.push({
                        name: match[1],
                        version: match[2],
                        category
                    });
                }
                break;
            case 'npm':
                try {
                    const npmData = JSON.parse(output);
                    Object.entries(npmData.dependencies || {}).forEach(([name, info]) => {
                        packages.push({
                            name,
                            version: info.version || 'unknown',
                            category
                        });
                    });
                }
                catch (error) {
                }
                break;
            case 'go':
                const goPattern = /^([a-zA-Z0-9][a-zA-Z0-9\/\._-]+)\s+([0-9][0-9a-zA-Z.~_+-]*)$/gm;
                while ((match = goPattern.exec(output)) !== null) {
                    packages.push({
                        name: match[1],
                        version: match[2],
                        category
                    });
                }
                break;
        }
        return packages;
    }
    buildPackageTree(packages) {
        const tree = {
            name: 'root',
            version: '1.0.0',
            dependencies: []
        };
        packages.forEach(pkg => {
            const node = {
                name: pkg.name,
                version: pkg.version,
                size: pkg.size,
                category: pkg.category
            };
            if (pkg.name.startsWith('node') || pkg.name === 'npm') {
                node.dependencies = [
                    { name: 'libuv', version: '1.44.0', category: 'system' },
                    { name: 'openssl', version: '1.1.1k', category: 'system' }
                ];
            }
            else if (pkg.name.startsWith('python')) {
                node.dependencies = [
                    { name: 'libpython3', version: '3.11.0', category: 'system' },
                    { name: 'sqlite3', version: '3.40.0', category: 'system' }
                ];
            }
            tree.dependencies?.push(node);
        });
        return tree;
    }
    limitTreeDepth(tree, depth) {
        if (depth <= 0 || !tree.dependencies)
            return;
        tree.dependencies.forEach(dep => {
            this.limitTreeDepth(dep, depth - 1);
            if (depth === 1) {
                dep.dependencies = undefined;
            }
        });
    }
}
exports.PackageManager = PackageManager;
//# sourceMappingURL=PackageManager.js.map