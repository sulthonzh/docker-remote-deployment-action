/**
 * Diff engine — compare two agent sessions and detect regressions
 */
import { AgentSession, SessionDiff, ToolCallDiff, FileChangeDiff } from './types.js';
/** Compare tool calls between sessions */
export declare function diffToolCalls(baseline: AgentSession, current: AgentSession): ToolCallDiff[];
/** Compare file sets between sessions */
export declare function diffFiles(baseline: AgentSession, current: AgentSession): FileChangeDiff[];
/** Compute Jaccard similarity between tool call sequences */
export declare function computeSimilarity(baseline: AgentSession, current: AgentSession): number;
/** Detect regressions from a diff */
export declare function detectRegressions(diff: SessionDiff, threshold?: number): {
    regressionDetected: boolean;
    reasons: string[];
};
/** Main diff function — compare two sessions */
export declare function diffSessions(baseline: AgentSession, current: AgentSession, threshold?: number): SessionDiff;
