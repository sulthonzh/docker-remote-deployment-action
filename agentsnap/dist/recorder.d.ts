/**
 * Session recording — capture agent sessions from JSONL/stdin
 */
import { AgentSession, SessionEvent, ToolCall, AgentFormat } from './types.js';
/** Generate a unique session ID */
export declare function generateId(): string;
/** Detect the agent format from a JSONL line */
export declare function detectFormat(line: string): AgentFormat;
/** Parse a single JSONL line into a session event */
export declare function parseLine(line: string): SessionEvent | null;
/** Extract tool calls from parsed events */
export declare function extractToolCalls(events: SessionEvent[]): ToolCall[];
/** Build a full AgentSession from raw events */
export declare function buildSession(events: SessionEvent[], task: string, agent: string, format: AgentFormat): AgentSession;
/** Record a session from a JSONL file */
export declare function recordFromFile(filePath: string, task: string, agent: string, format?: AgentFormat): AgentSession | null;
/** Record a session from JSONL text */
export declare function recordFromText(text: string, task: string, agent: string, format?: AgentFormat): AgentSession;
/** Save a session to disk */
export declare function saveSession(session: AgentSession, dir: string): string;
/** Load a session from disk */
export declare function loadSession(filePath: string): AgentSession;
