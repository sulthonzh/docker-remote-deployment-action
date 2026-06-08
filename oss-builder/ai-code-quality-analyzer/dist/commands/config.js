"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const ConfigManager_1 = require("../utils/ConfigManager");
const ConfigCommand = new commander_1.Command('config')
    .description('Manage configuration')
    .option('--show', 'Show current configuration')
    .option('--edit', 'Edit configuration in editor')
    .option('--reset', 'Reset to default configuration')
    .option('--preset <name>', 'Show preset configuration')
    .option('--validate', 'Validate current configuration')
    .action(async (options) => {
    const configManager = new ConfigManager_1.ConfigManager();
    const configPath = path_1.default.join(process.cwd(), '.ai-quality.json');
    if (options.show) {
        await showConfig(configManager);
    }
    else if (options.edit) {
        await editConfig(configPath);
    }
    else if (options.reset) {
        await resetConfig(configPath, configManager);
    }
    else if (options.preset) {
        await showPreset(configManager, options.preset);
    }
    else if (options.validate) {
        await validateConfig(configManager);
    }
    else {
        console.log(chalk_1.default.yellow('Please specify an action: --show, --edit, --reset, --preset, or --validate'));
    }
});
exports.ConfigCommand = ConfigCommand;
async function showConfig(configManager) {
    try {
        const config = configManager.loadConfig();
        console.log(chalk_1.default.blue('📋 Current Configuration:'));
        console.log(JSON.stringify(config, null, 2));
    }
    catch (error) {
        console.log(chalk_1.default.yellow('No configuration found. Run `ai-quality init` to create one.'));
    }
}
async function editConfig(configPath) {
    if (!fs_extra_1.default.existsSync(configPath)) {
        console.log(chalk_1.default.yellow('No configuration found. Run `ai-quality init` to create one.'));
        return;
    }
    // Try to open in default editor
    const editor = process.env.EDITOR || 'nano';
    console.log(chalk_1.default.blue(`📝 Opening configuration in ${editor}...`));
    // This is just a placeholder - in a real implementation, 
    // you'd spawn the editor process
    console.log(chalk_1.default.yellow('Edit functionality would open your editor here'));
    console.log(chalk_1.default.gray(`Configuration file: ${configPath}`));
}
async function resetConfig(configPath, configManager) {
    if (!fs_extra_1.default.existsSync(configPath)) {
        console.log(chalk_1.default.yellow('No configuration found to reset.'));
        return;
    }
    const answers = await require('inquirer').prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset the configuration to defaults?',
            default: false
        }
    ]);
    if (answers.confirm) {
        const defaultConfig = configManager.getDefaultConfig();
        await fs_extra_1.default.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(chalk_1.default.green('✅ Configuration reset to defaults'));
    }
    else {
        console.log(chalk_1.default.yellow('Reset cancelled'));
    }
}
async function showPreset(configManager, presetName) {
    const preset = configManager.getPreset(presetName);
    if (!preset) {
        console.log(chalk_1.default.red(`❌ Unknown preset: ${presetName}`));
        console.log(chalk_1.default.yellow('Available presets: basic, advanced, strict'));
        return;
    }
    console.log(chalk_1.default.blue(`🎯 Preset Configuration: ${presetName}`));
    console.log(JSON.stringify(preset, null, 2));
}
async function validateConfig(configManager) {
    try {
        const config = configManager.loadConfig();
        const validation = configManager.validateConfig(config);
        if (validation.valid) {
            console.log(chalk_1.default.green('✅ Configuration is valid'));
        }
        else {
            console.log(chalk_1.default.red('❌ Configuration validation failed:'));
            validation.errors.forEach(error => {
                console.log(chalk_1.default.red(`  - ${error}`));
            });
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`❌ Error validating configuration: ${error.message}`));
    }
}
//# sourceMappingURL=config.js.map