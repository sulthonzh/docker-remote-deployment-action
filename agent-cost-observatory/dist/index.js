#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.tracker = exports.server = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const tracker_js_1 = require("./tracker.js");
const database_js_1 = require("./database.js");
const config_js_1 = require("./config.js");
// Initialize components
const db = new database_js_1.DatabaseManager();
exports.db = db;
const tracker = new tracker_js_1.TokenTracker(db);
exports.tracker = tracker;
const config = new config_js_1.ConfigManager();
// Create MCP server
const server = new index_js_1.Server({
    name: "agent-cost-observatory",
    version: "1.0.0",
    description: "AI Agent Cost & Token Observatory - Tracks token usage per tool call and agent",
}, {
    capabilities: {
        tools: {},
    },
});
exports.server = server;
// Store original tool calls for tracking
const toolCallRegistry = new Map();
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "aco_get_token_breakdown",
                description: "Get token usage breakdown for a specific time period or agent",
                inputSchema: {
                    type: "object",
                    properties: {
                        agent_id: {
                            type: "string",
                            description: "Specific agent ID to filter by (optional)"
                        },
                        start_time: {
                            type: "string",
                            description: "Start time in ISO format (optional, defaults to 24h ago)"
                        },
                        end_time: {
                            type: "string",
                            description: "End time in ISO format (optional, defaults to now)"
                        },
                        format: {
                            type: "string",
                            enum: ["table", "json", "summary"],
                            description: "Output format (optional, defaults to table)",
                            default: "table"
                        }
                    }
                },
            },
            {
                name: "aco_get_cost_recommendations",
                description: "Get cost optimization recommendations based on token usage patterns",
                inputSchema: {
                    type: "object",
                    properties: {
                        agent_id: {
                            type: "string",
                            description: "Specific agent ID to filter by (optional)"
                        },
                        time_period: {
                            type: "string",
                            enum: ["1h", "24h", "7d", "30d"],
                            description: "Time period for analysis (optional, defaults to 24h)",
                            default: "24h"
                        }
                    }
                },
            },
            {
                name: "aco_reset_tracking",
                description: "Reset token tracking data (use with caution)",
                inputSchema: {
                    type: "object",
                    properties: {
                        confirm: {
                            type: "boolean",
                            description: "Must be true to confirm reset",
                            default: false
                        }
                    }
                },
            },
        ],
    };
});
// Intercept and track tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // Generate a unique ID for this tool call
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Register the tool call for tracking
    toolCallRegistry.set(callId, {
        timestamp: new Date().toISOString(),
        agent_id: request.metadata?.agent_id || "unknown",
        tool_name: name,
        arguments: args,
        duration_ms: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
    });
    // Start timing
    const startTime = Date.now();
    try {
        // Execute the original tool call
        const result = await handleToolCall(name, args);
        // Calculate duration
        const duration = Date.now() - startTime;
        // Get the registered call data
        const callData = toolCallRegistry.get(callId);
        if (callData) {
            callData.duration_ms = duration;
            callData.result = result;
            // Estimate tokens (this will be enhanced later with actual token counting)
            const inputTokens = estimateInputTokens(name, args);
            const outputTokens = estimateOutputTokens(result);
            callData.input_tokens = inputTokens;
            callData.output_tokens = outputTokens;
            callData.total_tokens = inputTokens + outputTokens;
            callData.cost_usd = calculateCost(inputTokens, outputTokens);
            // Track the token usage
            await tracker.trackTokenUsage(callData);
            // Remove from registry
            toolCallRegistry.delete(callId);
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result),
                },
            ],
        };
    }
    catch (error) {
        // Calculate duration even on error
        const duration = Date.now() - startTime;
        // Get the registered call data and mark as failed
        const callData = toolCallRegistry.get(callId);
        if (callData) {
            callData.duration_ms = duration;
            callData.error = error instanceof Error ? error.message : String(error);
            callData.status = "error";
            // Track failed call
            await tracker.trackTokenUsage(callData);
            // Remove from registry
            toolCallRegistry.delete(callId);
        }
        throw error;
    }
});
// Handle tool calls (placeholder - will be enhanced)
async function handleToolCall(name, args) {
    // This is where we'd normally call the actual tool
    // For now, return a mock response
    return {
        success: true,
        message: `Tool ${name} executed successfully`,
        arguments: args,
        timestamp: new Date().toISOString(),
    };
}
// Estimate input tokens based on tool call
function estimateInputTokens(toolName, args) {
    // This is a simple estimation - will be enhanced with actual tiktoken counting
    const inputString = JSON.stringify({ tool: toolName, args });
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(inputString.length / 4);
}
// Estimate output tokens based on result
function estimateOutputTokens(result) {
    const outputString = JSON.stringify(result);
    // Rough estimate: 1 token ≈ 4 characters for English text  
    return Math.ceil(outputString.length / 4);
}
// Calculate cost based on tokens
function calculateCost(inputTokens, outputTokens) {
    // Rough cost estimates (will be enhanced with model-specific pricing)
    const inputCostPer1k = 0.002; // $0.002 per 1k tokens (GPT-3.5-like)
    const outputCostPer1k = 0.002; // $0.002 per 1k tokens (GPT-3.5-like)
    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;
    return inputCost + outputCost;
}
// CLI mode handling
if (process.argv.length > 2 && process.argv[2] !== "serve") {
    const { runCLI } = await Promise.resolve().then(() => __importStar(require("./cli.js")));
    await runCLI(process.argv.slice(2));
}
else {
    // Start MCP server
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Agent Cost Observatory MCP server running on stdio");
}
//# sourceMappingURL=index.js.map