// prompt-bisect: Snapshot store — file-based golden set management

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoldenSet, PromptSnapshot, BisectConfig, DEFAULT_CONFIG } from './types';

export class SnapshotStore {
  private config: BisectConfig;

  constructor(config?: Partial<BisectConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Initialize the snapshots directory and golden set file. */
  init(): void {
    const dir = this.config.snapshotsDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const goldenPath = this.goldenPath();
    if (!fs.existsSync(goldenPath)) {
      const golden: GoldenSet = {
        version: '1.0.0',
        created: new Date().toISOString(),
        prompts: [],
      };
      fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2), 'utf-8');
    }
  }

  /** Load the golden set from disk. */
  load(): GoldenSet {
    const goldenPath = this.goldenPath();
    if (!fs.existsSync(goldenPath)) {
      throw new Error(`Golden set not found at ${goldenPath}. Run 'init' first.`);
    }
    return JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
  }

  /** Save the golden set to disk. */
  save(golden: GoldenSet): void {
    fs.writeFileSync(this.goldenPath(), JSON.stringify(golden, null, 2), 'utf-8');
  }

  /** Add a snapshot to the golden set. */
  add(snapshot: PromptSnapshot): void {
    const golden = this.load();
    // Check for duplicate id
    const existing = golden.prompts.findIndex(p => p.id === snapshot.id);
    if (existing >= 0) {
      golden.prompts[existing] = snapshot;
    } else {
      golden.prompts.push(snapshot);
    }
    this.save(golden);
  }

  /** Remove a snapshot by id. */
  remove(id: string): boolean {
    const golden = this.load();
    const idx = golden.prompts.findIndex(p => p.id === id);
    if (idx < 0) return false;
    golden.prompts.splice(idx, 1);
    this.save(golden);
    return true;
  }

  /** Get a snapshot by id. */
  get(id: string): PromptSnapshot | undefined {
    return this.load().prompts.find(p => p.id === id);
  }

  /** List all snapshots, optionally filtered by tag or model. */
  list(filters?: { tag?: string; model?: string }): PromptSnapshot[] {
    const golden = this.load();
    let results = golden.prompts;
    if (filters?.tag) {
      results = results.filter(p => p.tags?.includes(filters.tag!));
    }
    if (filters?.model) {
      results = results.filter(p => p.model === filters.model);
    }
    return results;
  }

  /** Save a history snapshot (for bisect tracking). */
  saveHistory(snapshot: PromptSnapshot): void {
    const historyDir = path.join(this.config.snapshotsDir, 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    const filename = `${snapshot.id}__${snapshot.timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(
      path.join(historyDir, filename),
      JSON.stringify(snapshot, null, 2),
      'utf-8'
    );
  }

  /** Load all history snapshots, sorted by timestamp. */
  loadHistory(promptId?: string): PromptSnapshot[] {
    const historyDir = path.join(this.config.snapshotsDir, 'history');
    if (!fs.existsSync(historyDir)) return [];

    const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
    const snapshots: PromptSnapshot[] = [];

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(historyDir, file), 'utf-8')) as PromptSnapshot;
      if (!promptId || data.id === promptId) {
        snapshots.push(data);
      }
    }

    return snapshots.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /** Import snapshots from a JSON file. */
  import(filePath: string): number {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const snapshots: PromptSnapshot[] = Array.isArray(data) ? data : data.prompts ?? [data];
    const golden = this.load();
    let added = 0;

    for (const snap of snapshots) {
      if (!snap.id || !snap.prompt || !snap.output) continue;
      const existing = golden.prompts.findIndex(p => p.id === snap.id);
      if (existing >= 0) {
        golden.prompts[existing] = snap;
      } else {
        golden.prompts.push(snap);
        added++;
      }
    }

    this.save(golden);
    return added;
  }

  /** Export golden set to a file. */
  export(outputPath: string): void {
    const golden = this.load();
    fs.writeFileSync(outputPath, JSON.stringify(golden, null, 2), 'utf-8');
  }

  private goldenPath(): string {
    return path.join(this.config.snapshotsDir, 'golden.json');
  }
}
