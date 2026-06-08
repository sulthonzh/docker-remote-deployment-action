// prompt-bisect: Core types

export interface PromptSnapshot {
  id: string;
  prompt: string;
  model: string;
  output: string;
  timestamp: string; // ISO 8601
  metadata?: Record<string, string>;
  tags?: string[];
}

export interface GoldenSet {
  version: string;
  created: string;
  prompts: PromptSnapshot[];
}

export interface DiffResult {
  promptId: string;
  similarity: number;
  status: 'match' | 'drift' | 'error';
  expected: string;
  actual: string;
  details?: string;
}

export interface BisectPoint {
  timestamp: string;
  snapshotId: string;
  similarity: number;
  changed: boolean;
}

export interface BisectResult {
  promptId: string;
  points: BisectPoint[];
  regressionAt?: string; // timestamp of first drift
  regressionSnapshotId?: string;
}

export interface RunResult {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  diffs: DiffResult[];
  durationMs: number;
}

export type OutputFormat = 'text' | 'json' | 'markdown';

export interface BisectConfig {
  threshold: number;        // similarity threshold (0-1), default 0.8
  method: 'string' | 'structured';  // comparison method
  snapshotsDir: string;     // directory for snapshots
  provider?: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
}

export const DEFAULT_CONFIG: BisectConfig = {
  threshold: 0.8,
  method: 'string',
  snapshotsDir: '.prompt-snapshots',
};
