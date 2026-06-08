"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportCommand = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const ConfigManager_1 = require("../utils/ConfigManager");
const ReportGenerator_1 = require("../utils/ReportGenerator");
const ReportCommand = new commander_1.Command('report')
    .description('Generate reports from previous analysis')
    .argument('<source>', 'Source directory containing analysis results or JSON file')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Output format (json|table|markdown|html)', 'table')
    .option('--title <title>', 'Report title', 'Code Quality Report')
    .option('--include-trends', 'Include trend analysis (requires multiple data points)')
    .option('--template <template>', 'Report template (basic|detailed|executive)')
    .action(async (source, options) => {
    try {
        // Load configuration
        const configManager = new ConfigManager_1.ConfigManager();
        const config = configManager.loadConfig();
        // Load analysis result
        let analysisResult;
        if (source.endsWith('.json')) {
            // Load from JSON file
            analysisResult = await loadAnalysisResultFromFile(source);
        }
        else {
            // Load from directory (latest analysis result)
            analysisResult = await loadLatestAnalysisResult(source);
        }
        // Generate report
        const reportGenerator = new ReportGenerator_1.ReportGenerator(config);
        await reportGenerator.generateReport(analysisResult, null, // No AI insights for report generation
        options.format, options.output, options.title, options.template);
        console.log(chalk_1.default.green('✅ Report generated successfully!'));
        if (options.output) {
            console.log(chalk_1.default.blue(`Output file: ${options.output}`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Report generation failed:'), error.message);
        process.exit(1);
    }
});
exports.ReportCommand = ReportCommand;
async function loadAnalysisResultFromFile(filePath) {
    try {
        const content = await fs_extra_1.default.readFile(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error(`Failed to load analysis result from ${filePath}: ${error.message}`);
    }
}
async function loadLatestAnalysisResult(directory) {
    const resultsDir = path_1.default.join(directory, '.ai-quality-results');
    if (!await fs_extra_1.default.pathExists(resultsDir)) {
        throw new Error(`No analysis results found in ${directory}. Run 'ai-quality analyze' first.`);
    }
    // Find the most recent result file
    const files = await fs_extra_1.default.readdir(resultsDir);
    const resultFiles = files
        .filter(file => file.startsWith('analysis-') && file.endsWith('.json'))
        .sort()
        .reverse();
    if (resultFiles.length === 0) {
        throw new Error(`No analysis results found in ${resultsDir}`);
    }
    const latestFile = path_1.default.join(resultsDir, resultFiles[0] || '');
    return loadAnalysisResultFromFile(latestFile);
}
//# sourceMappingURL=report.js.map