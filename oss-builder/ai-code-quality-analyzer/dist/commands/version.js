"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const package_json_1 = require("../../package.json");
const VersionCommand = new commander_1.Command('version')
    .description('Show version information')
    .action(() => {
    console.log(chalk_1.default.blue('AI Code Quality Analyzer'));
    console.log(chalk_1.default.green(`Version: ${package_json_1.version}`));
    console.log(chalk_1.default.gray('\nAnalyze code quality with AI-powered insights\n'));
    console.log(chalk_1.default.yellow('Features:'));
    console.log('  • Complexity analysis (cyclomatic, cognitive, nesting)');
    console.log('  • Maintainability scoring with Halstead metrics');
    console.log('  • Performance analysis and optimization suggestions');
    console.log('  • Security issue detection');
    console.log('  • Best practices compliance checking');
    console.log('  • Documentation quality assessment');
    console.log('  • AI-generated insights and recommendations');
    console.log('  • Multiple output formats (JSON, Table, Markdown, HTML)');
    console.log('  • Comprehensive test coverage');
    console.log(chalk_1.default.gray('\nDocumentation: https://github.com/sulthonzh/ai-code-quality-analyzer'));
    console.log(chalk_1.default.gray('Support: https://github.com/sulthonzh/ai-code-quality-analyzer/issues'));
});
exports.VersionCommand = VersionCommand;
//# sourceMappingURL=version.js.map