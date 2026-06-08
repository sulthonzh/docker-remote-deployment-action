"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeCommand = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const CodeQualityAnalyzer_1 = require("../analyzers/CodeQualityAnalyzer");
const ReportGenerator_1 = require("../utils/ReportGenerator");
const AIGenerator_1 = require("../analyzers/AIGenerator");
const ConfigManager_1 = require("../utils/ConfigManager");
const AnalyzeCommand = new commander_1.Command('analyze')
    .description('Analyze code quality for a project')
    .argument('<path>', 'Path to analyze (directory or file)')
    .option('--output <format>', 'Output format (json|table|markdown|html)', 'table')
    .option('--include-ai', 'Include AI-generated insights', false)
    .option('--strict', 'Use strict mode (lower thresholds)', false)
    .option('--exclude <patterns...>', 'Exclude patterns')
    .option('--include <extensions...>', 'File extensions to include', ['ts', 'js', 'tsx', 'jsx'])
    .option('--max-files <number>', 'Maximum files to analyze', '1000')
    .action(async (path, options) => {
    const spinner = (0, ora_1.default)('Starting code quality analysis...').start();
    try {
        // Load configuration
        const configManager = new ConfigManager_1.ConfigManager();
        const config = configManager.loadConfig();
        // Update config with CLI options
        config.output.format = options.output;
        config.output.includeDetails = true;
        config.output.includeSuggestions = true;
        // Create analyzer
        const analyzer = new CodeQualityAnalyzer_1.CodeQualityAnalyzer(config);
        const aiGenerator = new AIGenerator_1.AIGenerator(config);
        spinner.text = 'Scanning files...';
        const files = await analyzer.scanFiles(path, options);
        spinner.text = 'Analyzing code metrics...';
        const analysisResult = await analyzer.analyzeFiles(files);
        // Generate AI insights if requested
        let aiInsights = null;
        if (options.includeAi) {
            spinner.text = 'Generating AI insights...';
            aiInsights = await aiGenerator.generateInsights(analysisResult);
        }
        spinner.succeed('Analysis completed!');
        // Generate and display report
        const reportGenerator = new ReportGenerator_1.ReportGenerator(config);
        await reportGenerator.generateReport(analysisResult, aiInsights, options.output);
        // Output summary
        console.log(chalk_1.default.blue('\n📊 Summary:'));
        console.log(`Files analyzed: ${analysisResult.summary.totalFiles}`);
        console.log(`Total lines: ${analysisResult.summary.totalLines}`);
        console.log(`Total functions: ${analysisResult.summary.totalFunctions}`);
        console.log(`Overall score: ${chalk_1.default.bold(analysisResult.summary.overallScore.toFixed(1) + '/100')}`);
        console.log(`Issues found: ${analysisResult.summary.issuesCount.total}`);
        if (analysisResult.summary.issuesCount.total > 0) {
            const issuesBySeverity = analysisResult.summary.issuesCount.bySeverity;
            console.log(chalk_1.default.red(`  Critical: ${issuesBySeverity.critical}`));
            console.log(chalk_1.default.yellow(`  High: ${issuesBySeverity.high}`));
            console.log(chalk_1.default.blue(`  Medium: ${issuesBySeverity.medium}`));
            console.log(chalk_1.default.green(`  Low: ${issuesBySeverity.low}`));
        }
        // Exit with appropriate code
        const exitCode = analysisResult.summary.issuesCount.total > 0 ? 1 : 0;
        process.exit(exitCode);
    }
    catch (error) {
        spinner.fail('Analysis failed!');
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
exports.AnalyzeCommand = AnalyzeCommand;
//# sourceMappingURL=analyze.js.map