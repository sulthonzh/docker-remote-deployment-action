#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const DockerAnalyzer_1 = require("./analyzer/DockerAnalyzer");
const SecurityScanner_1 = require("./scanner/SecurityScanner");
const PackageManager_1 = require("./PackageManager");
const SizeAnalyzer_1 = require("./analyzer/SizeAnalyzer");
const LayerAnalyzer_1 = require("./analyzer/LayerAnalyzer");
const program = new commander_1.Command();
program
    .name('dockalyze')
    .description('Docker image analyzer and security scanner')
    .version('1.0.0');
program
    .command('analyze')
    .description('Analyze a Docker image')
    .argument('<image>', 'Docker image name and tag')
    .option('-j, --json', 'Output in JSON format')
    .option('-o, --output <file>', 'Save results to file')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (image, options) => {
    const spinner = (0, ora_1.default)('Analyzing Docker image...').start();
    try {
        const analyzer = new DockerAnalyzer_1.DockerAnalyzer();
        const result = await analyzer.analyze(image);
        spinner.succeed('Image analysis complete');
        if (options.json) {
            const output = JSON.stringify(result, null, 2);
            if (options.output) {
                require('fs').writeFileSync(options.output, output);
                console.log(chalk_1.default.green(`Results saved to: ${options.output}`));
            }
            else {
                console.log(output);
            }
        }
        else {
            displayAnalysis(result, options.verbose);
        }
    }
    catch (error) {
        spinner.fail(`Analysis failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('scan')
    .description('Scan Docker image for security vulnerabilities')
    .argument('<image>', 'Docker image name and tag')
    .option('-s, --severity <levels>', 'Filter by severity (low,medium,high,critical)', 'low,medium,high,critical')
    .option('-f, --format <json|table|markdown>', 'Output format', 'table')
    .option('-e, --exclude <packages>', 'Exclude specific packages from scanning')
    .action(async (image, options) => {
    const spinner = (0, ora_1.default)('Scanning for vulnerabilities...').start();
    try {
        const scanner = new SecurityScanner_1.SecurityScanner();
        const result = await scanner.scan(image, options);
        spinner.succeed('Security scan complete');
        displayScanResults(result, options.format);
    }
    catch (error) {
        spinner.fail(`Scan failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('packages')
    .description('List all installed packages in Docker image')
    .argument('<image>', 'Docker image name and tag')
    .option('-t, --tree', 'Show dependency tree')
    .option('-d, --depth <number>', 'Tree depth limit', '2')
    .option('-f, --filter <text>', 'Filter packages by name')
    .action(async (image, options) => {
    const spinner = (0, ora_1.default)('Extracting package information...').start();
    try {
        const pkgManager = new PackageManager_1.PackageManager();
        const result = await pkgManager.getPackages(image, options);
        spinner.succeed('Package extraction complete');
        displayPackages(result, options);
    }
    catch (error) {
        spinner.fail(`Package extraction failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('size')
    .description('Analyze Docker image size')
    .argument('<image>', 'Docker image name and tag')
    .option('-H, --human-readable', 'Show sizes in human-readable format')
    .option('--sort <size|name>', 'Sort results', 'size')
    .option('-t, --threshold <size>', 'Only show files larger than threshold')
    .action(async (image, options) => {
    const spinner = (0, ora_1.default)('Analyzing image size...').start();
    try {
        const analyzer = new SizeAnalyzer_1.SizeAnalyzer();
        const result = await analyzer.analyze(image);
        spinner.succeed('Size analysis complete');
        displaySizeAnalysis(result, options);
    }
    catch (error) {
        spinner.fail(`Size analysis failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('layers')
    .description('Inspect Docker image layers')
    .argument('<image>', 'Docker image name and tag')
    .option('-s, --sizes', 'Show layer sizes')
    .option('-a, --all', 'Show all layer details')
    .option('-f, --format <json|table>', 'Output format', 'table')
    .action(async (image, options) => {
    const spinner = (0, ora_1.default)('Inspecting layers...').start();
    try {
        const analyzer = new LayerAnalyzer_1.LayerAnalyzer();
        const result = await analyzer.analyze(image);
        spinner.succeed('Layer inspection complete');
        displayLayers(result, options);
    }
    catch (error) {
        spinner.fail(`Layer inspection failed: ${error.message}`);
        process.exit(1);
    }
});
function displayAnalysis(result, verbose = false) {
    console.log(chalk_1.default.bold.blue('\n📋 Image Analysis'));
    console.log(chalk_1.default.gray(`Image: ${result.image}`));
    console.log(chalk_1.default.gray(`Size: ${formatBytes(result.size)}`));
    console.log(chalk_1.default.gray(`Layers: ${result.layers.length}`));
    if (verbose) {
        console.log('\n🏷️  Labels:');
        Object.entries(result.labels || {}).forEach(([key, value]) => {
            console.log(`  ${chalk_1.default.cyan(key)}: ${value}`);
        });
        console.log('\n🌍 Environment Variables:');
        Object.entries(result.environment || {}).forEach(([key, value]) => {
            console.log(`  ${chalk_1.default.cyan(key)}: ${value}`);
        });
    }
    if (result.packages && result.packages.length > 0) {
        console.log(`\n📦 Installed Packages: ${result.packages.length}`);
        const topPackages = result.packages.slice(0, verbose ? 10 : 5);
        topPackages.forEach((pkg) => {
            console.log(`  ${pkg.name} ${pkg.version} (${pkg.size ? formatBytes(pkg.size) : 'N/A'})`);
        });
        if (!verbose && result.packages.length > 5) {
            console.log(`  ... and ${result.packages.length - 5} more`);
        }
    }
}
function displayScanResults(result, format) {
    if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log(chalk_1.default.bold.blue('\n🔍 Security Scan Results'));
    console.log(chalk_1.default.gray(`Image: ${result.image}`));
    const severityColors = {
        critical: 'red',
        high: 'red',
        medium: 'yellow',
        low: 'green'
    };
    Object.entries(result.vulnerabilities || {}).forEach(([severity, vulns]) => {
        const vulnsArray = vulns;
        if (vulnsArray.length > 0) {
            const color = severityColors[severity] || 'white';
            console.log(`\\n🔴 ${severity.toUpperCase()} VULNERABILITIES: ${vulnsArray.length}`);
            vulnsArray.forEach((vuln) => {
                console.log(`  ${vuln.package} (${vuln.version})`);
                console.log(`    ${vuln.description}`);
                if (vuln.cve) {
                    console.log(`    CVE: ${vuln.cve}`);
                }
            });
        }
    });
}
function displayPackages(result, options) {
    if (options.tree) {
        console.log(chalk_1.default.bold.blue('\n🌳 Package Dependency Tree'));
        console.log(chalk_1.default.gray(`Image: ${result.image} (depth: ${options.depth})`));
        displayPackageTree(result.tree, 0, options);
    }
    else {
        console.log(chalk_1.default.bold.blue('\n📦 Package List'));
        console.log(chalk_1.default.gray(`Image: ${result.image}`));
        if (result.packages && result.packages.length > 0) {
            const filter = options.filter ? new RegExp(options.filter, 'i') : null;
            const filtered = filter ? result.packages.filter((pkg) => filter.test(pkg.name)) : result.packages;
            filtered.forEach((pkg) => {
                console.log(`  ${pkg.name} ${pkg.version} (${pkg.size ? formatBytes(pkg.size) : 'N/A'})`);
            });
        }
    }
}
function displayPackageTree(tree, depth, options = {}) {
    const indent = '  '.repeat(depth);
    const arrow = depth > 0 ? '├─ ' : '';
    console.log(`${indent}${arrow}${tree.name} ${tree.version}`);
    if (tree.dependencies && depth < parseInt(options.depth)) {
        tree.dependencies.forEach((dep, index) => {
            const isLast = index === tree.dependencies.length - 1;
            const prefix = isLast ? '└─ ' : '├─ ';
            displayPackageTree({ ...dep, name: prefix + dep.name }, depth + 1, options);
        });
    }
}
function displaySizeAnalysis(result, options) {
    console.log(chalk_1.default.bold.blue('\n📊 Size Analysis'));
    console.log(chalk_1.default.gray(`Image: ${result.image}`));
    console.log(`Total Size: ${formatBytes(result.totalSize)}`);
    if (options.humanReadable) {
        if (result.largestFiles && result.largestFiles.length > 0) {
            console.log('\n🎯 Largest Files:');
            result.largestFiles.forEach((file) => {
                console.log(`  ${file.path} (${formatBytes(file.size)})`);
            });
        }
        if (result.layerSizes && result.layerSizes.length > 0) {
            console.log('\n🗂️  Layer Sizes:');
            result.layerSizes.forEach((layer) => {
                console.log(`  ${layer.id}: ${formatBytes(layer.size)}`);
            });
        }
    }
    else {
        console.log('\n🎯 Largest Files (bytes):');
        result.largestFiles?.slice(0, 10).forEach((file) => {
            console.log(`  ${file.path}: ${file.size}`);
        });
    }
}
function displayLayers(result, options) {
    if (options.sizes) {
        console.log(chalk_1.default.bold.blue('\n🗂️  Layer Sizes'));
        console.log(chalk_1.default.gray(`Image: ${result.image}`));
        result.layers.forEach((layer) => {
            console.log(`${layer.id}: ${formatBytes(layer.size)}`);
            if (options.all && layer.commands) {
                console.log(`  Commands: ${layer.commands.join(' | ')}`);
            }
        });
    }
    else {
        console.log(chalk_1.default.bold.blue('\n📋 Layer Information'));
        console.log(chalk_1.default.gray(`Image: ${result.image}`));
        result.layers.forEach((layer) => {
            console.log(`\n${layer.id}: ${formatBytes(layer.size)}`);
            if (layer.commands) {
                console.log(`  Commands: ${layer.commands.join(' | ')}`);
            }
            if (layer.diffSize) {
                console.log(`  Size change: ${formatBytes(layer.diffSize)}`);
            }
        });
    }
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
program.parse();
//# sourceMappingURL=index.js.map