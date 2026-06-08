"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIGenerator = void 0;
class AIGenerator {
    constructor(config) {
        this.config = config;
    }
    async generateInsights(analysisResult) {
        // Simulate AI analysis - in a real implementation, this would call an AI service
        const insights = {
            summary: await this.generateSummary(analysisResult),
            topIssues: await this.identifyTopIssues(analysisResult),
            overallAssessment: await this.generateOverallAssessment(analysisResult),
            improvementSuggestions: await this.generateImprovementSuggestions(analysisResult),
            recommendedActions: await this.generateRecommendedActions(analysisResult),
        };
        return insights;
    }
    async generateSummary(result) {
        const totalScore = result.summary.overallScore;
        const totalIssues = result.summary.issuesCount.total;
        const totalFiles = result.summary.totalFiles;
        let summary = `The codebase shows `;
        if (totalScore >= 80) {
            summary += `excellent overall quality with a score of ${totalScore.toFixed(1)}/100. `;
        }
        else if (totalScore >= 60) {
            summary += `good overall quality with a score of ${totalScore.toFixed(1)}/100, `;
            if (totalIssues > 0) {
                summary += `though there are ${totalIssues} issues that should be addressed. `;
            }
        }
        else if (totalScore >= 40) {
            summary += `fair overall quality with a score of ${totalScore.toFixed(1)}/100 and ${totalIssues} issues that need attention. `;
        }
        else {
            summary += `poor overall quality with a score of ${totalScore.toFixed(1)}/100 and ${totalIssues} critical issues requiring immediate action. `;
        }
        summary += `Across ${totalFiles} files, `;
        if (result.summary.totalFunctions > 0) {
            const avgFunctionsPerFile = (result.summary.totalFunctions / totalFiles).toFixed(1);
            summary += `the average of ${avgFunctionsPerFile} functions per file `;
        }
        summary += `indicates a `;
        if (result.summary.averageComplexity < 5) {
            summary += 'simple and maintainable codebase structure.';
        }
        else if (result.summary.averageComplexity < 10) {
            summary += 'moderately complex codebase that could benefit from refactoring.';
        }
        else {
            summary += 'highly complex codebase requiring significant refactoring efforts.';
        }
        return summary;
    }
    async identifyTopIssues(result) {
        const topIssues = [];
        // Find most common issue type
        const issueTypes = Object.entries(result.summary.issuesCount.byType)
            .sort((a, b) => b[1] - a[1]);
        if (issueTypes.length > 0 && issueTypes[0] && issueTypes[0][1] > 0) {
            const [type, count] = issueTypes[0];
            topIssues.push({
                issue: `${type} issues (${count} occurrences)`,
                impact: this.getImpactLevel(type, result.summary.issuesCount.bySeverity),
                suggestion: this.getSuggestionForType(type),
            });
        }
        // Add high severity issues
        const highSeverityFiles = result.files
            .filter(file => file.issues.some(issue => issue.severity === 'high' || issue.severity === 'critical'))
            .slice(0, 3);
        highSeverityFiles.forEach(file => {
            const highIssues = file.issues.filter(issue => issue.severity === 'high' || issue.severity === 'critical');
            if (highIssues.length > 0) {
                const relativePath = this.getRelativePath(file.path);
                topIssues.push({
                    issue: `High severity issues in ${relativePath}`,
                    impact: 'Major impact on code quality and maintainability',
                    suggestion: highIssues[0]?.suggestion || 'Address critical issues immediately',
                });
            }
        });
        return topIssues.slice(0, 5); // Return top 5 issues
    }
    async generateOverallAssessment(result) {
        const score = result.summary.overallScore;
        const issues = result.summary.issuesCount.total;
        const complexity = result.summary.averageComplexity;
        let assessment = 'Overall Assessment: ';
        if (score >= 80) {
            assessment += 'The codebase demonstrates excellent quality standards with minimal issues and well-structured code.';
        }
        else if (score >= 60) {
            assessment += 'The codebase shows good quality with some areas for improvement, particularly in complexity and maintainability.';
        }
        else if (score >= 40) {
            assessment += 'The codebase has significant quality issues that need attention, especially in reducing complexity and improving maintainability.';
        }
        else {
            assessment += 'The codebase requires immediate attention as it has critical quality issues that could lead to maintenance problems and bugs.';
        }
        // Add specific insights
        if (complexity > 10) {
            assessment += ' High cyclomatic complexity indicates functions are too complex and should be refactored.';
        }
        if (issues > 20) {
            assessment += ' A large number of issues suggests systematic problems in development practices.';
        }
        if (result.files.length > 50) {
            assessment += ' The large codebase size requires additional attention to maintain consistency and quality.';
        }
        return assessment;
    }
    async generateImprovementSuggestions(result) {
        const suggestions = [];
        // Complexity suggestions
        if (result.summary.averageComplexity > 8) {
            suggestions.push('Refactor high-complexity functions by breaking them into smaller, more focused functions');
        }
        // Size suggestions
        const largeFiles = result.files.filter(file => file.lines > 200);
        if (largeFiles.length > 0) {
            suggestions.push(`Split ${largeFiles.length} large files into smaller modules to improve maintainability`);
        }
        // Function count suggestions
        const functionHeavyFiles = result.files.filter(file => file.functions > 15);
        if (functionHeavyFiles.length > 0) {
            suggestions.push(`Consolidate functions in ${functionHeavyFiles.length} files with excessive methods`);
        }
        // Security suggestions
        const securityIssues = result.summary.issuesCount.byType.security;
        if (securityIssues > 0) {
            suggestions.push('Address security issues immediately, particularly banned patterns and dangerous functions');
        }
        // Documentation suggestions
        const documentationIssues = result.summary.issuesCount.byType.documentation;
        if (documentationIssues > 0) {
            suggestions.push('Improve documentation for complex functions and modules');
        }
        // Testing suggestions
        const testFiles = result.files.filter(file => file.path.includes('test') || file.path.includes('spec'));
        const ratio = testFiles.length / result.files.length;
        if (ratio < 0.2) {
            suggestions.push('Consider increasing test coverage, current ratio is ' + (ratio * 100).toFixed(1) + '%');
        }
        return suggestions;
    }
    async generateRecommendedActions(result) {
        const actions = [];
        // Critical issues
        const criticalIssues = result.summary.issuesCount.bySeverity.critical;
        if (criticalIssues > 0) {
            actions.push({
                priority: 'high',
                action: `Address ${criticalIssues} critical security and quality issues`,
                estimatedEffort: '2-4 hours'
            });
        }
        // High complexity files
        const highComplexityFiles = result.files.filter(file => file.complexity.cyclomatic > 15);
        if (highComplexityFiles.length > 0) {
            actions.push({
                priority: 'high',
                action: `Refactor ${highComplexityFiles.length} high-complexity files`,
                estimatedEffort: `${highComplexityFiles.length * 3}-${highComplexityFiles.length * 8} hours`
            });
        }
        // Large files
        const largeFiles = result.files.filter(file => file.lines > 200);
        if (largeFiles.length > 0) {
            actions.push({
                priority: 'medium',
                action: `Split ${largeFiles.length} large files into smaller modules`,
                estimatedEffort: `${largeFiles.length * 2}-${largeFiles.length * 5} hours`
            });
        }
        // Missing tests
        const testRatio = result.files.filter(file => file.path.includes('test') || file.path.includes('spec')).length / result.files.length;
        if (testRatio < 0.3) {
            actions.push({
                priority: 'medium',
                action: 'Increase test coverage to at least 30%',
                estimatedEffort: '8-16 hours'
            });
        }
        // Documentation improvements
        const documentationIssues = result.summary.issuesCount.byType.documentation;
        if (documentationIssues > 0) {
            actions.push({
                priority: 'low',
                action: `Improve documentation for ${documentationIssues} issues`,
                estimatedEffort: '2-4 hours'
            });
        }
        // Performance optimizations
        const performanceIssues = result.summary.issuesCount.byType.performance;
        if (performanceIssues > 0) {
            actions.push({
                priority: 'low',
                action: `Optimize ${performanceIssues} performance issues`,
                estimatedEffort: '1-3 hours'
            });
        }
        return actions;
    }
    getImpactLevel(type, severities) {
        if (type === 'security')
            return 'Critical security risk';
        if (type === 'complexity')
            return 'High impact on maintainability';
        if (type === 'performance')
            return 'Significant performance impact';
        if (type === 'maintainability')
            return 'Major maintainability concerns';
        return 'Quality impact';
    }
    getSuggestionForType(type) {
        const suggestions = {
            complexity: 'Break down complex functions into smaller, focused units',
            maintainability: 'Improve code structure and reduce file sizes',
            performance: 'Optimize algorithms and reduce unnecessary computations',
            security: 'Remove security risks and follow secure coding practices',
            bestPractices: 'Apply established coding standards and patterns',
            documentation: 'Add comprehensive documentation for complex code',
        };
        return suggestions[type] || 'Review and improve the identified issues';
    }
    getRelativePath(absolutePath) {
        // Simple implementation - in practice, you'd use path.relative()
        return absolutePath.split('/').pop() || absolutePath;
    }
}
exports.AIGenerator = AIGenerator;
//# sourceMappingURL=AIGenerator.js.map