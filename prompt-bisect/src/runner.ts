// prompt-bisect: Core runner — compare actual outputs against golden set

import { DiffResult, RunResult, PromptSnapshot, BisectConfig, DEFAULT_CONFIG } from './types';
import { SnapshotStore } from './store';
import { stringSimilarity, combinedSimilarity, structuredSimilarity } from './similarity';

export class BisectRunner {
  private store: SnapshotStore;
  private config: BisectConfig;

  constructor(config?: Partial<BisectConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new SnapshotStore(this.config);
  }

  /**
   * Run a regression check: compare new outputs against the golden set.
   * Pass a `fetchOutput` function that returns the actual output for each prompt.
   */
  async run(
    fetchOutput: (snapshot: PromptSnapshot) => Promise<string>
  ): Promise<RunResult> {
    const start = Date.now();
    const golden = this.store.load();
    const diffs: DiffResult[] = [];

    for (const snapshot of golden.prompts) {
      try {
        const actual = await fetchOutput(snapshot);
        const similarity = this.computeSimilarity(snapshot.output, actual);
        const status = this.getStatus(similarity);

        diffs.push({
          promptId: snapshot.id,
          similarity,
          status,
          expected: snapshot.output,
          actual,
          details: status === 'drift'
            ? this.describeDiff(snapshot.output, actual, similarity)
            : undefined,
        });

        // Save to history for bisect
        this.store.saveHistory({
          ...snapshot,
          output: actual,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        diffs.push({
          promptId: snapshot.id,
          similarity: 0,
          status: 'error',
          expected: snapshot.output,
          actual: '',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const durationMs = Date.now() - start;

    return {
      timestamp: new Date().toISOString(),
      total: golden.prompts.length,
      passed: diffs.filter(d => d.status === 'match').length,
      failed: diffs.filter(d => d.status === 'drift').length,
      errors: diffs.filter(d => d.status === 'error').length,
      diffs,
      durationMs,
    };
  }

  /**
   * Run a dry comparison against provided outputs (no fetching).
   */
  compare(outputs: { id: string; output: string }[]): RunResult {
    const start = Date.now();
    const golden = this.store.load();
    const diffs: DiffResult[] = [];

    for (const snapshot of golden.prompts) {
      const provided = outputs.find(o => o.id === snapshot.id);

      if (!provided) {
        diffs.push({
          promptId: snapshot.id,
          similarity: 0,
          status: 'error',
          expected: snapshot.output,
          actual: '',
          details: 'No output provided for this prompt',
        });
        continue;
      }

      const similarity = this.computeSimilarity(snapshot.output, provided.output);
      const status = this.getStatus(similarity);

      diffs.push({
        promptId: snapshot.id,
        similarity,
        status,
        expected: snapshot.output,
        actual: provided.output,
        details: status === 'drift'
          ? this.describeDiff(snapshot.output, provided.output, similarity)
          : undefined,
      });
    }

    const durationMs = Date.now() - start;

    return {
      timestamp: new Date().toISOString(),
      total: golden.prompts.length,
      passed: diffs.filter(d => d.status === 'match').length,
      failed: diffs.filter(d => d.status === 'drift').length,
      errors: diffs.filter(d => d.status === 'error').length,
      diffs,
      durationMs,
    };
  }

  /**
   * Bisect: find when a prompt's output first drifted.
   * Walks through history chronologically and finds the first point where
   * similarity dropped below threshold.
   */
  bisect(promptId: string): import('./types').BisectResult | null {
    const history = this.store.loadHistory(promptId);
    if (history.length === 0) return null;

    const golden = this.store.load();
    const baseline = golden.prompts.find(p => p.id === promptId);
    if (!baseline) return null;

    const points: import('./types').BisectPoint[] = [];

    for (const snap of history) {
      const similarity = this.computeSimilarity(baseline.output, snap.output);
      points.push({
        timestamp: snap.timestamp,
        snapshotId: `${snap.id}__${snap.timestamp.replace(/[:.]/g, '-')}`,
        similarity,
        changed: similarity < this.config.threshold,
      });
    }

    // Find first drift point
    const firstDrift = points.find(p => p.changed);

    return {
      promptId,
      points,
      regressionAt: firstDrift?.timestamp,
      regressionSnapshotId: firstDrift?.snapshotId,
    };
  }

  private computeSimilarity(expected: string, actual: string): number {
    switch (this.config.method) {
      case 'structured':
        return structuredSimilarity(expected, actual);
      case 'string':
        return stringSimilarity(expected, actual);
      default:
        return combinedSimilarity(expected, actual);
    }
  }

  private getStatus(similarity: number): 'match' | 'drift' | 'error' {
    if (similarity >= this.config.threshold) return 'match';
    return 'drift';
  }

  private describeDiff(expected: string, actual: string, similarity: number): string {
    const lines = [];

    lines.push(`Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(this.config.threshold * 100).toFixed(1)}%)`);

    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const maxLines = Math.max(expectedLines.length, actualLines.length);
    let changedLines = 0;

    for (let i = 0; i < maxLines; i++) {
      const e = expectedLines[i];
      const a = actualLines[i];
      if (e !== a) changedLines++;
    }

    lines.push(`Lines changed: ${changedLines}/${maxLines}`);
    return lines.join('\n');
  }
}
