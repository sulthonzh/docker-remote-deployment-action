#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCLI = runCLI;
const commander_1 = require("commander");
const tracker_js_1 = require("./tracker.js");
const database_js_1 = require("./database.js");
const config_js_1 = require("./config.js");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const program = new commander_1.Command();
const db = new database_js_1.DatabaseManager();
const tracker = new tracker_js_1.TokenTracker(db);
const config = new config_js_1.ConfigManager();
program
    .name("aco-cli")
    .description("Agent Cost Observatory CLI - Track and optimize AI token usage")
    .version("1.0.0");
// Initialize command
program
    .command("init")
    .description("Initialize Agent Cost Observatory configuration")
    .action(async () => {
    const spinner = ora("Initializing Agent Cost Observatory...").start();
    try {
        await config.initialize();
        spinner.succeed("Configuration initialized successfully");
        console.log("\n" + chalk_1.default.green("✓ Configuration file created at:"));
        console.log(chalk_1.default.blue("  ~/.aco/config.json"));
        console.log("\n" + chalk_1.default.green("✓ Database initialized at:"));
        console.log(chalk_1.default.blue("  ~/.aco/usage.db"));
    }
    catch (error) {
        spinner.fail("Failed to initialize configuration");
        console.error(chalk_1.default.red("Error:"), error);
    }
});
// Track command
program
    .command("track")
    .description("Track a tool call and log token usage")
    .option("-a, --agent <agent>", "Agent ID")
    .option("-t, --tool <tool>", "Tool name")
    .option("-i, --input <input>", "Input string to estimate tokens")
    .option("-o, --output <output>", "Output string to estimate tokens")
    .action(async (options) => {
    const spinner = ora("Tracking tool call...").start();
    try {
        const tokenData = {
            agent_id: options.agent || "unknown",
            tool_name: options.tool || "unknown",
            input_tokens: options.input ? Math.ceil(options.input.length / 4) : 0,
            output_tokens: options.output ? Math.ceil(options.output.length / 4) : 0,
            total_tokens: 0,
            cost_usd: 0,
            timestamp: new Date().toISOString(),
            duration_ms: 0,
            status: "completed",
        };
        tokenData.total_tokens = tokenData.input_tokens + tokenData.output_tokens;
        tokenData.cost_usd = calculateCost(tokenData.input_tokens, tokenData.output_tokens);
        await tracker.trackTokenUsage(tokenData);
        spinner.succeed("Tool call tracked successfully");
        console.log("\n" + chalk_1.default.cyan("Token Usage Summary:"));
        console.log(chalk_1.default.gray(`  Agent: ${tokenData.agent_id}`));
        console.log(chalk_1.default.gray(`  Tool: ${tokenData.tool_name}`));
        console.log(chalk_1.default.gray(`  Input Tokens: ${tokenData.input_tokens}`));
        console.log(chalk_1.default.gray(`  Output Tokens: ${tokenData.output_tokens}`));
        console.log(chalk_1.default.gray(`  Total Tokens: ${tokenData.total_tokens}`));
        console.log(chalk_1.default.green(`  Cost: $${tokenData.cost_usd.toFixed(6)}`));
    }
    catch (error) {
        spinner.fail("Failed to track tool call");
        console.error(chalk_1.default.red("Error:"), error);
    }
});
// Breakdown command
program
    .command("breakdown")
    .description("Get token usage breakdown")
    .option("-a, --agent <agent>", "Filter by agent ID")
    .option("-s, --start <time>", "Start time (ISO format)")
    .option("-e, --end <time>", "End time (ISO format)")
    .option("-f, --format <format>", "Output format (table|json|summary)", "table")
    .action(async (options) => {
    const spinner = ora("Fetching token breakdown...").start();
    try {
        const breakdown = await tracker.getTokenBreakdown({
            agent_id: options.agent,
            start_time: options.start,
            end_time: options.end,
            format: options.format,
        });
        spinner.succeed("Token breakdown retrieved");
        if (options.format === "json") {
            console.log(JSON.stringify(breakdown, null, 2));
        }
        else {
            displayBreakdownTable(breakdown);
        }
    }
    catch (error) {
        spinner.fail("Failed to get token breakdown");
        console.error(chalk_1.default.red("Error:"), error);
    }
});
// Recommendations command
program
    .command("recommendations")
    .description("Get cost optimization recommendations")
    .option("-a, --agent <agent>", "Filter by agent ID")
    .option("-p, --period <period>", "Time period (1h|24h|7d|30d)", "24h")
    .action(async (options) => {
    const spinner = ora("Analyzing usage patterns...").start();
    try {
        const recommendations = await tracker.getCostRecommendations({
            agent_id: options.agent,
            time_period: options.period,
        });
        spinner.succeed("Analysis complete");
        displayRecommendations(recommendations);
    }
    catch (error) {
        spinner.fail("Failed to get recommendations");
        console.error(chalk_1.default.red("Error:"), error);
    }
});
// Reset command
program
    .command("reset")
    .description("Reset tracking data (interactive confirmation)")
    .action(async () => {
    const { confirmReset } = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "confirmReset",
            message: "Are you sure you want to reset all tracking data? This cannot be undone.",
            default: false,
        },
    ]);
    if (!confirmReset) {
        console.log(chalk_1.default.yellow("Reset cancelled"));
        return;
    }
    const spinner = ora("Resetting tracking data...").start();
    try {
        await db.reset();
        spinner.succeed("Tracking data reset successfully");
    }
    catch (error) {
        spinner.fail("Failed to reset tracking data");
        console.error(chalk_1.default.red("Error:"), error);
    }
});
// Status command
program
    .command("status")
    .description("Show observatory status")
    .action(async () => {
    try {
        const status = await tracker.getSystemStatus();
        console.log(chalk_1.default.bold.cyan("Agent Cost Observatory Status"));
        console.log(chalk_1.default.gray("=".repeat(40)));
        console.log(chalk_1.default.green("✓ Database Connected"));
        console.log(chalk_1.default.green("✓ Tracking Active"));
        console.log(chalk_1.default.gray(`Total Tool Calls: ${status.total_calls}`));
        console.log(chalk_1.default.gray(`Total Tokens: ${status.total_tokens.toLocaleString()}`));
        console.log(chalk_1.default.gray(`Total Cost: $${status.total_cost.toFixed(4)}`));
        console.log(chalk_1.default.gray(`Active Agents: ${status.active_agents}`));
        if (status.cost_recommendations.length > 0) {
            console.log(chalk_1.default.yellow("\n💡 Quick Recommendations:"));
            status.cost_recommendations.slice(0, 3).forEach(rec => {
                console.log(chalk_1.default.gray(`  • ${rec}`));
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Error getting status:"), error);
    }
});
// Helper functions
function calculateCost(inputTokens, outputTokens) {
    const inputCostPer1k = 0.002;
    const outputCostPer1k = 0.002;
    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;
    return inputCost + outputCost;
}
function displayBreakdownTable(breakdown) {
    console.log("\n" + chalk_1.default.bold.cyan("Token Usage Breakdown"));
    console.log(chalk_1.default.gray("-".repeat(80)));
    if (breakdown.by_agent && Object.keys(breakdown.by_agent).length > 0) {
        console.log(chalk_1.default.bold.gray("\nBy Agent:"));
        Object.entries(breakdown.by_agent).forEach(([agent, data]) => {
            console.log(chalk_1.default.gray(`  ${agent}:`));
            console.log(chalk_1.default.gray(`    Calls: ${data.call_count}`));
            console.log(chalk_1.default.gray(`    Tokens: ${data.total_tokens.toLocaleString()}`));
            console.log(chalk_1.default.gray(`    Cost: $${data.total_cost.toFixed(4)}`));
        });
    }
    if (breakdown.by_tool && Object.keys(breakdown.by_tool).length > 0) {
        console.log(chalk_1.default.bold.gray("\nBy Tool:"));
        Object.entries(breakdown.by_tool).forEach(([tool, data]) => {
            console.log(chalk_1.default.gray(`  ${tool}:`));
            console.log(chalk_1.default.gray(`    Calls: ${data.call_count}`));
            console.log(chalk_1.default.gray(`    Tokens: ${data.total_tokens.toLocaleString()}`));
            console.log(chalk_1.default.gray(`    Cost: $${data.total_cost.toFixed(4)}`));
        });
    }
    console.log(chalk_1.default.bold.gray("\nSummary:"));
    console.log(chalk_1.default.gray(`  Total Calls: ${breakdown.summary.total_calls}`));
    console.log(chalk_1.default.gray(`  Total Tokens: ${breakdown.summary.total_tokens.toLocaleString()}`));
    console.log(chalk_1.default.gray(`  Total Cost: $${breakdown.summary.total_cost.toFixed(4)}`));
    console.log(chalk_1.default.gray(`  Avg Tokens/Call: ${breakdown.summary.avg_tokens_per_call}`));
}
function displayRecommendations(recommendations) {
    console.log("\n" + chalk_1.default.bold.yellow("💡 Cost Optimization Recommendations"));
    console.log(chalk_1.default.gray("-".repeat(60)));
    if (recommendations.high_cost_tools && recommendations.high_cost_tools.length > 0) {
        console.log(chalk_1.default.bold.red("\n🔴 High Cost Tools:"));
        recommendations.high_cost_tools.forEach((tool) => {
            console.log(chalk_1.default.red(`  ${tool.tool_name}: $${tool.total_cost.toFixed(4)} (${tool.call_count} calls)`));
            console.log(chalk_1.default.gray(`    Suggestion: Consider optimizing prompts or reducing frequency`));
        });
    }
    if (recommendations.frequent_tools && recommendations.frequent_tools.length > 0) {
        console.log(chalk_1.default.bold.yellow("\n🟡 High Frequency Tools:"));
        recommendations.frequent_tools.forEach((tool) => {
            console.log(chalk_1.default.yellow(`  ${tool.tool_name}: ${tool.call_count} calls`));
            console.log(chalk_1.default.gray(`    Suggestion: Cache results where possible`));
        });
    }
    if (recommendations.inefficient_agents && recommendations.inefficient_agents.length > 0) {
        console.log(chalk_1.default.bold.magenta("\n🟠 Inefficient Agents:"));
        recommendations.inefficient_agents.forEach((agent) => {
            console.log(chalk_1.default.magenta(`  ${agent.agent_id}: $${agent.total_cost.toFixed(4)} for ${agent.total_tokens.toLocaleString()} tokens`));
            console.log(chalk_1.default.gray(`    Suggestion: Review prompt engineering and context management`));
        });
    }
    if (recommendations.optimization_tips && recommendations.optimization_tips.length > 0) {
        console.log(chalk_1.default.bold.green("\n✅ General Tips:"));
        recommendations.optimization_tips.forEach((tip) => {
            console.log(chalk_1.default.green(`  • ${tip}`));
        });
    }
}
// Helper function to run CLI
async function runCLI(args) {
    await program.parseAsync(args);
}
if (process.argv.length > 2) {
    runCLI(process.argv.slice(2));
}
//# sourceMappingURL=cli.js.map