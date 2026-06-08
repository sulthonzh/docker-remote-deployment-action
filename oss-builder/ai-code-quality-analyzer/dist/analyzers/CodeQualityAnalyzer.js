"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeQualityAnalyzer = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const glob_1 = require("glob");
const ignore_1 = __importDefault(require("ignore"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const FileProcessor_1 = require("./FileProcessor");
class CodeQualityAnalyzer {
    constructor(config) {
        this.config = config;
        this.fileProcessor = new FileProcessor_1.FileProcessor(config);
    }
    async scanFiles(scanPath, options) {
        const ig = (0, ignore_1.default)();
        // Add exclusion patterns
        if (this.config.exclude.directories.length > 0) {
            ig.add(this.config.exclude.directories);
        }
        if (this.config.exclude.patterns.length > 0) {
            ig.add(this.config.exclude.patterns);
        }
        const files = [];
        const maxFiles = parseInt(options.maxFiles) || 1000;
        // If scanPath is a file, return it directly
        const stats = await fs_extra_1.default.stat(scanPath);
        if (stats.isFile()) {
            return [scanPath];
        }
        // Find files recursively
        const pattern = path_1.default.join(scanPath, '**/*');
        try {
            const foundFiles = await (0, glob_1.glob)(pattern, {
                ignore: this.config.exclude.directories,
                nodir: true,
            });
            // Filter by file extensions and ignore patterns
            for (const file of foundFiles.slice(0, maxFiles)) {
                const relativePath = path_1.default.relative(scanPath, file);
                // Check file extension
                if (options.include && options.include.length > 0) {
                    const ext = path_1.default.extname(file).substring(1);
                    if (!options.include.includes(ext)) {
                        continue;
                    }
                }
                // Check ignore patterns
                if (ig.ignores(relativePath)) {
                    continue;
                }
                // Additional file exclusions
                const basename = path_1.default.basename(file);
                if (this.config.exclude.files.includes(basename) ||
                    this.config.exclude.files.includes(`*${path_1.default.extname(file)}`)) {
                    continue;
                }
                files.push(file);
            }
        }
        catch (error) {
            // Fallback: manual file discovery
            try {
                const items = await fs_extra_1.default.readdir(scanPath, { withFileTypes: true });
                for (const item of items) {
                    if (item.isDirectory()) {
                        const subFiles = await this.scanFiles(path_1.default.join(scanPath, item.name), options);
                        files.push(...subFiles);
                    }
                    else if (item.isFile()) {
                        const filePath = path_1.default.join(scanPath, item.name);
                        files.push(filePath);
                    }
                }
            }
            catch (manualError) {
                // Silently fallback - manual discovery failed
            }
        }
        return files;
    }
    async analyzeFiles(files) {
        const totalFiles = files.length;
        const fileMetrics = [];
        let totalLines = 0;
        let totalFunctions = 0;
        let totalComplexity = 0;
        let totalMaintainability = 0;
        let allIssues = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file)
                continue;
            const metrics = await this.analyzeFile(file);
            fileMetrics.push(metrics);
            totalLines += metrics.lines;
            totalFunctions += metrics.functions;
            totalComplexity += metrics.complexity.cyclomatic;
            totalMaintainability += metrics.maintainability.score;
            allIssues.push(...metrics.issues);
        }
        // Calculate summary
        const issuesBySeverity = this.groupIssuesBySeverity(allIssues);
        const issuesByType = this.groupIssuesByType(allIssues);
        const summary = {
            totalFiles,
            totalLines,
            totalFunctions,
            averageComplexity: totalFiles > 0 ? totalComplexity / totalFiles : 0,
            averageMaintainability: totalFiles > 0 ? totalMaintainability / totalFiles : 0,
            overallScore: this.calculateOverallScore(fileMetrics),
            issuesCount: {
                total: allIssues.length,
                bySeverity: issuesBySeverity,
                byType: issuesByType,
            },
        };
        // Generate recommendations
        const recommendations = this.generateRecommendations(fileMetrics, summary);
        const patterns = this.identifyPatterns(fileMetrics, allIssues);
        return {
            summary,
            files: fileMetrics,
            recommendations,
            patterns,
        };
    }
    async analyzeFile(filePath) {
        const content = await fs_extra_1.default.readFile(filePath, 'utf8');
        const lines = content.split('\n').length;
        const metrics = await this.fileProcessor.processFile(filePath, content);
        // Apply thresholds and create issues
        const issues = this.checkViolations(metrics, filePath);
        return {
            path: filePath,
            lines,
            functions: metrics.functions.length,
            classes: metrics.classes.length,
            complexity: metrics.complexity,
            maintainability: metrics.maintainability,
            issues,
            suggestions: this.generateFileSuggestions(metrics, issues),
        };
    }
    checkViolations(metrics, filePath) {
        const issues = [];
        // Complexity violations
        if (this.config.enabled.complexity) {
            if (metrics.complexity.cyclomatic > this.config.thresholds.complexity.maxCyclomatic) {
                issues.push({
                    type: 'complexity',
                    severity: 'high',
                    rule: 'cyclomatic-complexity',
                    message: `Cyclomatic complexity ${metrics.complexity.cyclomatic} exceeds threshold ${this.config.thresholds.complexity.maxCyclomatic}`,
                    line: metrics.complexity.cyclomaticLine || 1,
                    column: 1,
                    suggestion: 'Consider breaking down this function into smaller functions',
                });
            }
            if (metrics.complexity.cognitive > this.config.thresholds.complexity.maxCognitive) {
                issues.push({
                    type: 'complexity',
                    severity: 'medium',
                    rule: 'cognitive-complexity',
                    message: `Cognitive complexity ${metrics.complexity.cognitive} exceeds threshold ${this.config.thresholds.complexity.maxCognitive}`,
                    line: metrics.complexity.cognitiveLine || 1,
                    column: 1,
                    suggestion: 'Simplify nested conditions and loops',
                });
            }
            if (metrics.complexity.nesting > this.config.thresholds.complexity.maxNesting) {
                issues.push({
                    type: 'complexity',
                    severity: 'medium',
                    rule: 'nesting-depth',
                    message: `Nesting depth ${metrics.complexity.nesting} exceeds threshold ${this.config.thresholds.complexity.maxNesting}`,
                    line: metrics.complexity.nestingLine || 1,
                    column: 1,
                    suggestion: 'Extract nested logic to separate functions',
                });
            }
        }
        // Maintainability violations
        if (this.config.enabled.maintainability) {
            if (metrics.functions.length > this.config.thresholds.maintainability.maxFunctionsPerFile) {
                issues.push({
                    type: 'maintainability',
                    severity: 'medium',
                    rule: 'functions-per-file',
                    message: `Too many functions (${metrics.functions.length}) in file, max is ${this.config.thresholds.maintainability.maxFunctionsPerFile}`,
                    line: 1,
                    column: 1,
                    suggestion: 'Consider splitting this file into multiple modules',
                });
            }
        }
        // Security violations
        if (this.config.enabled.security) {
            // Check for banned patterns
            this.config.thresholds.security.bannedPatterns.forEach((pattern, index) => {
                const regex = new RegExp(pattern);
                if (regex.test(metrics.content)) {
                    issues.push({
                        type: 'security',
                        severity: 'high',
                        rule: 'security-banned-pattern',
                        message: `Security risk detected: banned pattern found`,
                        line: metrics.bannedPatternLines?.[index] || 1,
                        column: 1,
                        suggestion: 'Avoid using potentially dangerous functions and patterns',
                    });
                }
            });
        }
        return issues;
    }
    groupIssuesBySeverity(issues) {
        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
        issues.forEach(issue => {
            bySeverity[issue.severity]++;
        });
        return bySeverity;
    }
    groupIssuesByType(issues) {
        const byType = {
            complexity: 0,
            maintainability: 0,
            performance: 0,
            security: 0,
            bestPractices: 0,
            documentation: 0,
        };
        issues.forEach(issue => {
            if (issue.type in byType) {
                byType[issue.type]++;
            }
        });
        return byType;
    }
    calculateOverallScore(fileMetrics) {
        if (fileMetrics.length === 0)
            return 0;
        let totalScore = 0;
        let weightSum = 0;
        fileMetrics.forEach(file => {
            let fileScore = 100;
            // Deduct points for issues
            file.issues.forEach(issue => {
                const deduction = {
                    critical: 20,
                    high: 10,
                    medium: 5,
                    low: 2,
                }[issue.severity];
                fileScore -= deduction;
            });
            // Complexity penalty
            if (this.config.enabled.complexity) {
                const complexityScore = Math.max(0, 100 - (file.complexity.cyclomatic * 2));
                fileScore = (fileScore + complexityScore) / 2;
            }
            // Maintainability score
            if (this.config.enabled.maintainability) {
                fileScore = (fileScore + file.maintainability.score) / 2;
            }
            // Weight by file size (larger files have more impact)
            const weight = Math.min(file.lines / 100, 2);
            totalScore += fileScore * weight;
            weightSum += weight;
        });
        return weightSum > 0 ? totalScore / weightSum : 0;
    }
    generateRecommendations(fileMetrics, summary) {
        const recommendations = [];
        // Overall recommendations
        if (summary.overallScore < 70) {
            recommendations.push('Overall code quality needs significant improvement. Consider refactoring high-priority issues first.');
        }
        // Complexity recommendations
        if (this.config.enabled.complexity) {
            const highComplexityFiles = fileMetrics.filter(f => f.complexity.cyclomatic > this.config.thresholds.complexity.maxCyclomatic);
            if (highComplexityFiles.length > 0) {
                recommendations.push(`${highComplexityFiles.length} files have high cyclomatic complexity. Focus on refactoring these first.`);
            }
        }
        // Size recommendations
        const largeFiles = fileMetrics.filter(f => f.lines > this.config.thresholds.maintainability.maxLinesPerFile);
        if (largeFiles.length > 0) {
            recommendations.push(`${largeFiles.length} files are too large. Consider splitting them into smaller, more focused modules.`);
        }
        // Function recommendations
        const functionHeavyFiles = fileMetrics.filter(f => f.functions > this.config.thresholds.maintainability.maxFunctionsPerFile);
        if (functionHeavyFiles.length > 0) {
            recommendations.push(`${functionHeavyFiles.length} files have too many functions. Consider grouping related functions into classes or modules.`);
        }
        return recommendations;
    }
    identifyPatterns(fileMetrics, issues) {
        const patterns = {
            commonIssues: [],
            improvementAreas: [],
            riskFactors: [],
        };
        // Find common issue patterns
        const issueTypes = Object.entries(this.groupIssuesByType(issues));
        const topIssues = issueTypes.sort((a, b) => b[1] - a[1]).slice(0, 3);
        topIssues.forEach(([type, count]) => {
            patterns.commonIssues.push(`${type} issues (${count} occurrences)`);
        });
        // Identify improvement areas
        if (fileMetrics.some(f => f.complexity.cyclomatic > 15)) {
            patterns.improvementAreas.push('High cyclomatic complexity in critical files');
        }
        if (fileMetrics.some(f => f.lines > 500)) {
            patterns.improvementAreas.push('Large files that need refactoring');
        }
        // Risk factors
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
            patterns.riskFactors.push(`Critical security issues that require immediate attention`);
        }
        return patterns;
    }
    generateFileSuggestions(metrics, issues) {
        const suggestions = [];
        // Performance suggestions
        if (this.config.enabled.performance && metrics.functions.length > this.config.thresholds.performance.maxFunctions) {
            suggestions.push('Consider optimizing performance by reducing the number of functions');
        }
        // Documentation suggestions
        if (this.config.enabled.documentation && metrics.complexity.cyclomatic > 5) {
            suggestions.push('This function is complex - consider adding more detailed documentation');
        }
        return suggestions;
    }
}
exports.CodeQualityAnalyzer = CodeQualityAnalyzer;
//# sourceMappingURL=CodeQualityAnalyzer.js.map