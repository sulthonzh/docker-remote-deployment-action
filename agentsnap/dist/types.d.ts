/**
 * Core types for agentsnap — agent snapshot testing
 */
/** Supported agent formats we can parse */
export type AgentFormat = 'codex' | 'claude-code' | 'cursor' | 'generic' | 'auto';
/** A single tool call within an agent session */
export interface ToolCall {
    id: string;
    tool: string;
    input: Record<string, unknown>;
    output?: string;
    timestamp: string;
    duration_ms?: number;
    success: boolean;
}
/** A single event in an agent session */
export interface SessionEvent {
    type: 'tool_call' | 'message' | 'decision' | 'error' | 'file_read' | 'file_write' | 'state_change';
    timestamp: string;
    data: Record<string, unknown>;
}
/** A recorded agent session */
export interface AgentSession {
    id: string;
    agent: string;
    format: AgentFormat;
    task: string;
    startedAt: string;
    endedAt?: string;
    events: SessionEvent[];
    toolCalls: ToolCall[];
    filesRead: string[];
    filesWritten: string[];
    filesModified: string[];
    totalTokens?: number;
    totalDuration_ms?: number;
    errorCount: number;
    success: boolean;
    metadata: Record<string, unknown>;
}
/** Result of comparing two sessions */
export interface SessionDiff {
    baselineId: string;
    currentId: string;
    summary: DiffSummary;
    toolCallChanges: ToolCallDiff[];
    fileChanges: FileChangeDiff[];
    timingDiff: TimingDiff;
    tokenDiff?: TokenDiff;
    regressionDetected: boolean;
    regressionReasons: string[];
}
export interface DiffSummary {
    toolCallsAdded: number;
    toolCallsRemoved: number;
    toolCallsChanged: number;
    filesAdded: number;
    filesRemoved: number;
    filesModified: number;
    errorCountDiff: number;
    successChanged: boolean;
    durationDiff_ms: number;
    similarityScore: number;
}
export interface ToolCallDiff {
    tool: string;
    change: 'added' | 'removed' | 'changed' | 'unchanged';
    baseline?: ToolCall;
    current?: ToolCall;
    fieldChanges: string[];
}
export interface FileChangeDiff {
    path: string;
    change: 'added' | 'removed' | 'modified' | 'unchanged';
}
export interface TimingDiff {
    baseline_ms: number;
    current_ms: number;
    diff_ms: number;
    percentChange: number;
}
export interface TokenDiff {
    baseline: number;
    current: number;
    diff: number;
    percentChange: number;
}
/** Snapshot metadata */
export interface SnapshotMeta {
    id: string;
    task: string;
    agent: string;
    format: AgentFormat;
    createdAt: string;
    sessionFile: string;
    tags: string[];
}
/** Config */
export interface AgentsnapConfig {
    snapshotsDir: string;
    defaultFormat: AgentFormat;
    similarityThreshold: number;
    ignoreTools: string[];
    ignorePaths: string[];
}
