/**
 * Snapshot manager — CRUD for snapshots
 */
import { AgentSession, SnapshotMeta, AgentsnapConfig } from './types.js';
/** Initialize agentsnap in a project */
export declare function init(projectDir: string): AgentsnapConfig;
/** Load config */
export declare function loadConfig(projectDir: string): AgentsnapConfig;
/** Save a session as a named snapshot */
export declare function createSnapshot(projectDir: string, session: AgentSession, tags?: string[]): SnapshotMeta;
/** List all snapshots */
export declare function listSnapshots(projectDir: string): SnapshotMeta[];
/** Load a snapshot by ID */
export declare function loadSnapshot(projectDir: string, id: string): {
    meta: SnapshotMeta;
    session: AgentSession;
} | null;
/** Delete a snapshot by ID */
export declare function deleteSnapshot(projectDir: string, id: string): boolean;
/** Find snapshots by task name */
export declare function findSnapshotsByTask(projectDir: string, task: string): SnapshotMeta[];
