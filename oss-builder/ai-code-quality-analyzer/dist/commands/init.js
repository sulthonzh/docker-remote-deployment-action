"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const ConfigManager_1 = require("../utils/ConfigManager");
const InitCommand = new commander_1.Command('init')
    .description('Initialize AI Code Quality Analyzer configuration')
    .option('--force', 'Overwrite existing configuration without prompting')
    .option('--preset <name>', 'Use preset configuration (basic|advanced|strict)')
    .action(async (options) => {
    const configPath = path_1.default.join(process.cwd(), '.ai-quality.json');
    // Check if config already exists
    if (fs_extra_1.default.existsSync(configPath) && !options.force) {
        console.log(chalk_1.default.yellow('Configuration file already exists! Use --force to overwrite.'));
        return;
    }
    console.log(chalk_1.default.blue('🔧 Initializing AI Code Quality Analyzer configuration...\n'));
    // Load default config
    const configManager = new ConfigManager_1.ConfigManager();
    const defaultConfig = configManager.getDefaultConfig();
    // If preset is provided, use it
    if (options.preset) {
        const presetConfig = configManager.getPreset(options.preset);
        if (presetConfig) {
            await saveConfig(configPath, presetConfig);
            console.log(chalk_1.default.green(`✅ Configuration initialized with '${options.preset}' preset`));
            return;
        }
        else {
            console.log(chalk_1.default.red(`❌ Unknown preset: ${options.preset}`));
            console.log(chalk_1.default.yellow('Available presets: basic, advanced, strict'));
            return;
        }
    }
    // Interactive setup
    const answers = await inquirer_1.default.prompt([
        {
            type: 'checkbox',
            name: 'enabledMetrics',
            message: 'Which quality metrics should be enabled?',
            choices: [
                { name: 'Complexity Analysis', value: 'complexity', checked: true },
                { name: 'Maintainability Score', value: 'maintainability', checked: true },
                { name: 'Performance Analysis', value: 'performance', checked: true },
                { name: 'Security Issues', value: 'security', checked: true },
                { name: 'Best Practices', value: 'bestPractices', checked: true },
                { name: 'Documentation Quality', value: 'documentation', checked: false }
            ]
        },
        {
            type: 'list',
            name: 'outputFormat',
            message: 'Default output format:',
            choices: [
                { name: 'Table (CLI-friendly)', value: 'table' },
                { name: 'JSON (machine-readable)', value: 'json' },
                { name: 'Markdown (documentation)', value: 'markdown' },
                { name: 'HTML (web)', value: 'html' }
            ],
            default: 'table'
        },
        {
            type: 'confirm',
            name: 'includeAI',
            message: 'Include AI-generated insights?',
            default: false
        },
        {
            type: 'checkbox',
            name: 'excludeDirs',
            message: 'Directories to exclude:',
            choices: [
                { name: 'node_modules', value: 'node_modules', checked: true },
                { name: 'dist', value: 'dist', checked: true },
                { name: 'build', value: 'build', checked: true },
                { name: '.git', value: '.git', checked: true },
                { name: 'coverage', value: 'coverage', checked: true },
                { name: 'test', value: 'test', checked: false },
                { name: 'tests', value: 'tests', checked: false }
            ]
        }
    ]);
    // Build config from answers
    const config = {
        ...defaultConfig,
        enabled: {
            complexity: answers.enabledMetrics.includes('complexity'),
            maintainability: answers.enabledMetrics.includes('maintainability'),
            performance: answers.enabledMetrics.includes('performance'),
            security: answers.enabledMetrics.includes('security'),
            bestPractices: answers.enabledMetrics.includes('bestPractices'),
            documentation: answers.enabledMetrics.includes('documentation')
        },
        output: {
            ...defaultConfig.output,
            format: answers.outputFormat
        },
        exclude: {
            ...defaultConfig.exclude,
            directories: answers.excludeDirs
        },
        ai: {
            ...defaultConfig.ai,
            enabled: answers.includeAI
        }
    };
    // Save config
    await saveConfig(configPath, config);
    console.log(chalk_1.default.green('\n✅ Configuration initialized successfully!'));
    console.log(chalk_1.default.blue(`Configuration file: ${configPath}`));
    console.log(chalk_1.default.yellow('\nNext steps:'));
    console.log('  Run `ai-quality analyze ./src` to analyze your code');
    console.log('  Run `ai-quality config --show` to view current configuration');
    console.log('  Run `ai-quality --help` for more options');
});
exports.InitCommand = InitCommand;
async function saveConfig(path, config) {
    await fs_extra_1.default.writeFile(path, JSON.stringify(config, null, 2));
}
//# sourceMappingURL=init.js.map