"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const cli_table3_1 = __importDefault(require("cli-table3"));
class ReportGenerator {
    constructor(config) {
        this.config = config;
    }
    async generateReport(result, aiInsights, format = 'table', outputPath, title = 'Code Quality Report', template = 'basic') {
        switch (format) {
            case 'json':
                await this.generateJsonReport(result, aiInsights, outputPath);
                break;
            case 'table':
                this.generateTableReport(result, aiInsights);
                break;
            case 'markdown':
                await this.generateMarkdownReport(result, aiInsights, outputPath, title);
                break;
            case 'html':
                await this.generateHtmlReport(result, aiInsights, outputPath, title, template);
                break;
            default:
                throw new Error(`Unsupported output format: ${format}`);
        }
    }
    generateTableReport(result, aiInsights) {
        console.log(chalk_1.default.blue.bold('\n📊 Code Quality Analysis Report'));
        console.log(chalk_1.default.gray('─'.repeat(60)));
        // Summary table
        const summaryTable = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Metric'), chalk_1.default.cyan('Value')],
            colWidths: [30, 30],
            style: { head: [], border: [] }
        });
        summaryTable.push(['Files Analyzed', result.summary.totalFiles.toString()], ['Total Lines', result.summary.totalLines.toString()], ['Total Functions', result.summary.totalFunctions.toString()], ['Avg Complexity', result.summary.averageComplexity.toFixed(2)], ['Avg Maintainability', result.summary.averageMaintainability.toFixed(2)], ['Overall Score', this.scoreColor(result.summary.overallScore.toFixed(1) + '/100')], ['Total Issues', this.issueCountColor(result.summary.issuesCount.total)], ['Critical Issues', this.severityColor('critical', result.summary.issuesCount.bySeverity.critical.toString())], ['High Issues', this.severityColor('high', result.summary.issuesCount.bySeverity.high.toString())], ['Medium Issues', this.severityColor('medium', result.summary.issuesCount.bySeverity.medium.toString())], ['Low Issues', this.severityColor('low', result.summary.issuesCount.bySeverity.low.toString())]);
        console.log(summaryTable.toString());
        // Issues by type
        if (this.config.output.includeDetails) {
            console.log(chalk_1.default.blue.bold('\n🎯 Issues by Type'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            const typeTable = new cli_table3_1.default({
                head: [chalk_1.default.cyan('Type'), chalk_1.default.cyan('Count')],
                colWidths: [20, 20],
                style: { head: [], border: [] }
            });
            Object.entries(result.summary.issuesCount.byType).forEach(([type, count]) => {
                typeTable.push([this.typeColor(type), count.toString()]);
            });
            console.log(typeTable.toString());
        }
        // Top files with issues
        if (this.config.output.includeDetails && result.files.length > 0) {
            console.log(chalk_1.default.blue.bold('\n🔍 Files with Most Issues'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            const filesTable = new cli_table3_1.default({
                head: [chalk_1.default.cyan('File'), chalk_1.default.cyan('Issues'), chalk_1.default.cyan('Score')],
                colWidths: [40, 10, 10],
                style: { head: [], border: [] }
            });
            const topFiles = result.files
                .filter(file => file.issues.length > 0)
                .sort((a, b) => b.issues.length - a.issues.length)
                .slice(0, 5);
            topFiles.forEach(file => {
                const relativePath = path_1.default.relative(process.cwd(), file.path);
                const score = this.calculateFileScore(file);
                filesTable.push([
                    relativePath,
                    file.issues.length.toString(),
                    this.scoreColor(score.toFixed(1) + '/100')
                ]);
            });
            console.log(filesTable.toString());
        }
        // Recommendations
        if (result.recommendations.length > 0) {
            console.log(chalk_1.default.blue.bold('\n💡 Recommendations'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            result.recommendations.forEach((rec, index) => {
                console.log(chalk_1.default.gray(`${index + 1}. ${rec}`));
            });
        }
        // AI Insights
        if (aiInsights && this.config.output.includeDetails) {
            console.log(chalk_1.default.blue.bold('\n🤖 AI-Generated Insights'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            console.log(chalk_1.default.white(aiInsights.summary));
            console.log();
            if (aiInsights.topIssues.length > 0) {
                console.log(chalk_1.default.yellow('Top Issues:'));
                aiInsights.topIssues.forEach(issue => {
                    console.log(chalk_1.default.gray(`  • ${issue.impact}: ${issue.suggestion}`));
                });
                console.log();
            }
            console.log(chalk_1.default.yellow('Recommended Actions:'));
            aiInsights.recommendedActions.forEach(action => {
                const color = action.priority === 'high' ? 'red' : action.priority === 'medium' ? 'yellow' : 'green';
                console.log(chalk_1.default[color](`  [${action.priority.toUpperCase()}] ${action.action} (${action.estimatedEffort})`));
            });
        }
        // Common patterns
        if (this.config.output.includeDetails && result.patterns.commonIssues.length > 0) {
            console.log(chalk_1.default.blue.bold('\n📈 Common Patterns'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            result.patterns.commonIssues.forEach(pattern => {
                console.log(chalk_1.default.gray(`  • ${pattern}`));
            });
        }
    }
    async generateJsonReport(result, aiInsights, outputPath) {
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                format: 'json',
            },
            summary: result.summary,
            files: result.files,
            recommendations: result.recommendations,
            patterns: result.patterns,
            aiInsights,
        };
        const jsonContent = JSON.stringify(report, null, 2);
        if (outputPath) {
            await fs_extra_1.default.writeFile(outputPath, jsonContent);
        }
        else {
            console.log(jsonContent);
        }
    }
    async generateMarkdownReport(result, aiInsights, outputPath, title = 'Code Quality Report') {
        let markdown = `# ${title}\n\n`;
        markdown += `Generated: ${new Date().toISOString()}\n\n`;
        // Summary
        markdown += `## Summary\n\n`;
        markdown += `- **Files Analyzed**: ${result.summary.totalFiles}\n`;
        markdown += `- **Total Lines**: ${result.summary.totalLines}\n`;
        markdown += `- **Total Functions**: ${result.summary.totalFunctions}\n`;
        markdown += `- **Average Complexity**: ${result.summary.averageComplexity.toFixed(2)}\n`;
        markdown += `- **Average Maintainability**: ${result.summary.averageMaintainability.toFixed(2)}\n`;
        markdown += `- **Overall Score**: ${result.summary.overallScore.toFixed(1)}/100\n`;
        markdown += `- **Total Issues**: ${result.summary.issuesCount.total}\n\n`;
        // Issues by severity
        markdown += `## Issues by Severity\n\n`;
        markdown += `- **Critical**: ${result.summary.issuesCount.bySeverity.critical}\n`;
        markdown += `- **High**: ${result.summary.issuesCount.bySeverity.high}\n`;
        markdown += `- **Medium**: ${result.summary.issuesCount.bySeverity.medium}\n`;
        markdown += `- **Low**: ${result.summary.issuesCount.bySeverity.low}\n\n`;
        // Issues by type
        markdown += `## Issues by Type\n\n`;
        Object.entries(result.summary.issuesCount.byType).forEach(([type, count]) => {
            markdown += `- **${type.charAt(0).toUpperCase() + type.slice(1)}**: ${count}\n`;
        });
        markdown += '\n';
        // Top files
        if (result.files.length > 0) {
            markdown += `## Files with Most Issues\n\n`;
            markdown += '| File | Issues | Score |\n';
            markdown += '|------|--------|--------|\n';
            const topFiles = result.files
                .filter(file => file.issues.length > 0)
                .sort((a, b) => b.issues.length - a.issues.length)
                .slice(0, 5);
            topFiles.forEach(file => {
                const relativePath = path_1.default.relative(process.cwd(), file.path);
                const score = this.calculateFileScore(file);
                markdown += `| ${relativePath} | ${file.issues.length} | ${score.toFixed(1)}/100 |\n`;
            });
            markdown += '\n';
        }
        // Recommendations
        if (result.recommendations.length > 0) {
            markdown += `## Recommendations\n\n`;
            result.recommendations.forEach((rec, index) => {
                markdown += `${index + 1}. ${rec}\n`;
            });
            markdown += '\n';
        }
        // AI Insights
        if (aiInsights) {
            markdown += `## AI-Generated Insights\n\n`;
            markdown += `${aiInsights.summary}\n\n`;
            if (aiInsights.topIssues.length > 0) {
                markdown += `### Top Issues\n\n`;
                aiInsights.topIssues.forEach(issue => {
                    markdown += `- **${issue.impact}**: ${issue.suggestion}\n`;
                });
                markdown += '\n';
            }
            markdown += `### Recommended Actions\n\n`;
            aiInsights.recommendedActions.forEach(action => {
                markdown += `- **${action.priority.toUpperCase()}**: ${action.action} (${action.estimatedEffort})\n`;
            });
            markdown += '\n';
        }
        // Common patterns
        if (result.patterns.commonIssues.length > 0) {
            markdown += `## Common Patterns\n\n`;
            result.patterns.commonIssues.forEach(pattern => {
                markdown += `- ${pattern}\n`;
            });
            markdown += '\n';
        }
        if (outputPath) {
            await fs_extra_1.default.writeFile(outputPath, markdown);
        }
        else {
            console.log(markdown);
        }
    }
    async generateHtmlReport(result, aiInsights, outputPath, title = 'Code Quality Report', template = 'basic') {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #007acc; margin: 0; }
        .header p { color: #666; margin: 10px 0 0 0; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 6px; min-width: 150px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007acc; }
        .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .issue { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .issue.critical { background-color: #ffebee; border-left: 4px solid #f44336; }
        .issue.high { background-color: #fff3e0; border-left: 4px solid #ff9800; }
        .issue.medium { background-color: #e8f5e8; border-left: 4px solid #4caf50; }
        .issue.low { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f5f5f5; font-weight: bold; }
        .recommendation { background-color: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #007acc; }
        .ai-insights { background-color: #f5f0ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .score-excellent { color: #4caf50; }
        .score-good { color: #2196f3; }
        .score-fair { color: #ff9800; }
        .score-poor { color: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p>Generated: ${new Date().toISOString()}</p>
        </div>

        <div class="section">
            <h2>Summary</h2>
            <div style="display: flex; flex-wrap: wrap;">
                <div class="metric">
                    <div class="metric-value">${result.summary.totalFiles}</div>
                    <div class="metric-label">Files Analyzed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${result.summary.totalLines}</div>
                    <div class="metric-label">Total Lines</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${result.summary.totalFunctions}</div>
                    <div class="metric-label">Total Functions</div>
                </div>
                <div class="metric">
                    <div class="metric-value ${this.getScoreClass(result.summary.overallScore)}">${result.summary.overallScore.toFixed(1)}/100</div>
                    <div class="metric-label">Overall Score</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${result.summary.issuesCount.total}</div>
                    <div class="metric-label">Total Issues</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Issues by Severity</h2>
            <table class="table">
                <tr>
                    <th>Critical</th>
                    <th>High</th>
                    <th>Medium</th>
                    <th>Low</th>
                </tr>
                <tr>
                    <td>${result.summary.issuesCount.bySeverity.critical}</td>
                    <td>${result.summary.issuesCount.bySeverity.high}</td>
                    <td>${result.summary.issuesCount.bySeverity.medium}</td>
                    <td>${result.summary.issuesCount.bySeverity.low}</td>
                </tr>
            </table>
        </div>

        ${this.generateRecommendationsHtml(result.recommendations)}
        ${this.generateAIInsightsHtml(aiInsights)}
        ${this.generateCommonPatternsHtml(result.patterns)}
    </div>
</body>
</html>`;
        if (outputPath) {
            await fs_extra_1.default.writeFile(outputPath, html);
        }
        else {
            console.log(html);
        }
    }
    generateRecommendationsHtml(recommendations) {
        if (recommendations.length === 0)
            return '';
        let html = '<div class="section"><h2>Recommendations</h2>';
        recommendations.forEach((rec, index) => {
            html += `<div class="recommendation"><strong>${index + 1}.</strong> ${rec}</div>`;
        });
        html += '</div>';
        return html;
    }
    generateAIInsightsHtml(aiInsights) {
        if (!aiInsights)
            return '';
        let html = '<div class="ai-insights"><h2>AI-Generated Insights</h2>';
        html += `<p>${aiInsights.summary}</p>`;
        if (aiInsights.topIssues.length > 0) {
            html += '<h3>Top Issues</h3>';
            aiInsights.topIssues.forEach(issue => {
                html += `<div class="issue">
          <strong>${issue.impact}</strong>: ${issue.suggestion}
        </div>`;
            });
        }
        html += '<h3>Recommended Actions</h3>';
        aiInsights.recommendedActions.forEach(action => {
            const colorClass = action.priority === 'high' ? 'critical' :
                action.priority === 'medium' ? 'high' : 'medium';
            html += `<div class="issue ${colorClass}">
        <strong>${action.priority.toUpperCase()}</strong>: ${action.action} (${action.estimatedEffort})
      </div>`;
        });
        html += '</div>';
        return html;
    }
    generateCommonPatternsHtml(patterns) {
        if (patterns.commonIssues.length === 0)
            return '';
        let html = '<div class="section"><h2>Common Patterns</h2>';
        patterns.commonIssues.forEach((pattern) => {
            html += `<div class="issue medium">${pattern}</div>`;
        });
        html += '</div>';
        return html;
    }
    calculateFileScore(file) {
        let score = 100;
        file.issues.forEach((issue) => {
            const deduction = (issue.severity === 'critical' ? 20 :
                issue.severity === 'high' ? 10 :
                    issue.severity === 'medium' ? 5 :
                        issue.severity === 'low' ? 2 : 0);
            score -= deduction;
        });
        return Math.max(0, score);
    }
    scoreColor(score) {
        const value = parseFloat(score);
        if (value >= 80)
            return chalk_1.default.green.bold(score);
        if (value >= 60)
            return chalk_1.default.yellow.bold(score);
        return chalk_1.default.red.bold(score);
    }
    issueCountColor(count) {
        if (count === 0)
            return chalk_1.default.green.bold(count.toString());
        if (count <= 5)
            return chalk_1.default.yellow.bold(count.toString());
        return chalk_1.default.red.bold(count.toString());
    }
    severityColor(severity, count) {
        const colors = {
            critical: chalk_1.default.red.bold(count),
            high: chalk_1.default.yellow.bold(count),
            medium: chalk_1.default.blue.bold(count),
            low: chalk_1.default.green.bold(count),
        };
        return (severity === 'critical' ? colors.critical :
            severity === 'high' ? colors.high :
                severity === 'medium' ? colors.medium :
                    severity === 'low' ? colors.low : count);
    }
    typeColor(type) {
        const colors = {
            complexity: chalk_1.default.yellow.bold(type),
            maintainability: chalk_1.default.blue.bold(type),
            performance: chalk_1.default.red.bold(type),
            security: chalk_1.default.magenta.bold(type),
            bestPractices: chalk_1.default.green.bold(type),
            documentation: chalk_1.default.cyan.bold(type),
        };
        return (type === 'complexity' ? colors.complexity :
            type === 'maintainability' ? colors.maintainability :
                type === 'performance' ? colors.performance :
                    type === 'security' ? colors.security :
                        type === 'bestPractices' ? colors.bestPractices :
                            type === 'documentation' ? colors.documentation : type);
    }
    getScoreClass(score) {
        if (score >= 80)
            return 'score-excellent';
        if (score >= 60)
            return 'score-good';
        if (score >= 40)
            return 'score-fair';
        return 'score-poor';
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=ReportGenerator.js.map