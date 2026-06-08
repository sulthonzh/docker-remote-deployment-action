"use strict";
/**
 * Session recording — capture agent sessions from JSONL/stdin
 */
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
exports.generateId = generateId;
exports.detectFormat = detectFormat;
exports.parseLine = parseLine;
exports.extractToolCalls = extractToolCalls;
exports.buildSession = buildSession;
exports.recordFromFile = recordFromFile;
exports.recordFromText = recordFromText;
exports.saveSession = saveSession;
exports.loadSession = loadSession;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
/** Generate a unique session ID */
function generateId() {
    return `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
/** Detect the agent format from a JSONL line */
function detectFormat(line) {
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'tool_call' || obj.tool)
            return 'generic';
        if (obj.role === 'assistant' && obj.content)
            return 'claude-code';
        if (obj.type === 'response' && obj.model)
            return 'codex';
        if (obj.event === 'tool_use')
            return 'cursor';
    }
    catch { /* not JSON */ }
    return 'generic';
}
/** Parse a single JSONL line into a session event */
function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#'))
        return null;
    try {
        const obj = JSON.parse(trimmed);
        // Generic format: { type, timestamp, data }
        if (obj.type && obj.timestamp) {
            return obj;
        }
        // Codex format: { type: "response", model, ... }
        if (obj.type === 'response' || obj.type === 'tool_call') {
            return {
                type: 'tool_call',
                timestamp: obj.timestamp || new Date().toISOString(),
                data: obj,
            };
        }
        // Claude Code format: { role, content }
        if (obj.role === 'assistant' && Array.isArray(obj.content)) {
            const toolUse = obj.content.find((c) => c.type === 'tool_use');
            if (toolUse) {
                return {
                    type: 'tool_call',
                    timestamp: obj.timestamp || new Date().toISOString(),
                    data: { tool: toolUse.name, input: toolUse.input, id: toolUse.id },
                };
            }
            return {
                type: 'message',
                timestamp: obj.timestamp || new Date().toISOString(),
                data: { role: obj.role, content: obj.content },
            };
        }
        // Wrap anything else as generic event
        return {
            type: 'state_change',
            timestamp: obj.timestamp || new Date().toISOString(),
            data: obj,
        };
    }
    catch {
        return null;
    }
}
/** Extract tool calls from parsed events */
function extractToolCalls(events) {
    return events
        .filter(e => e.type === 'tool_call')
        .map((e, i) => ({
        id: e.data.id || `tc_${i}`,
        tool: e.data.tool || e.data.name || 'unknown',
        input: e.data.input || {},
        output: e.data.output,
        timestamp: e.timestamp,
        duration_ms: e.data.duration_ms,
        success: e.data.success !== false,
    }));
}
/** Build a full AgentSession from raw events */
function buildSession(events, task, agent, format) {
    const toolCalls = extractToolCalls(events);
    const filesRead = toolCalls
        .filter(tc => tc.tool === 'read' || tc.tool === 'Read' || tc.tool === 'cat')
        .map(tc => (tc.input.path || tc.input.file_path || tc.input.filename || ''))
        .filter(Boolean);
    const filesWritten = toolCalls
        .filter(tc => tc.tool === 'write' || tc.tool === 'Write' || tc.tool === 'edit' || tc.tool === 'Edit')
        .map(tc => (tc.input.path || tc.input.file_path || tc.input.filename || ''))
        .filter(Boolean);
    const errorEvents = events.filter(e => e.type === 'error');
    const timestamps = events.map(e => e.timestamp).filter(Boolean).sort();
    return {
        id: generateId(),
        agent,
        format,
        task,
        startedAt: timestamps[0] || new Date().toISOString(),
        endedAt: timestamps[timestamps.length - 1] || undefined,
        events,
        toolCalls,
        filesRead: [...new Set(filesRead)],
        filesWritten: [...new Set(filesWritten)],
        filesModified: [...new Set([...filesWritten])],
        totalTokens: undefined,
        totalDuration_ms: undefined,
        errorCount: errorEvents.length,
        success: errorEvents.length === 0,
        metadata: {},
    };
}
/** Record a session from a JSONL file */
function recordFromFile(filePath, task, agent, format = 'auto') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return recordFromText(content, task, agent, format);
}
/** Record a session from JSONL text */
function recordFromText(text, task, agent, format = 'auto') {
    const lines = text.split('\n');
    const events = [];
    let detectedFormat = format;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (detectedFormat === 'auto') {
            detectedFormat = detectFormat(trimmed);
        }
        const event = parseLine(trimmed);
        if (event)
            events.push(event);
    }
    return buildSession(events, task, agent, detectedFormat);
}
/** Save a session to disk */
function saveSession(session, dir) {
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${session.id}.jsonl`);
    const lines = session.events.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(filePath, lines, 'utf-8');
    return filePath;
}
/** Load a session from disk */
function loadSession(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const events = [];
    let format = 'generic';
    for (const line of lines) {
        const event = parseLine(line);
        if (event) {
            events.push(event);
            if (format === 'generic')
                format = detectFormat(line);
        }
    }
    const fileName = path.basename(filePath, '.jsonl');
    return {
        ...buildSession(events, '', 'unknown', format),
        id: fileName,
    };
}
