// prompt-bisect: Tests

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stringSimilarity, levenshteinSimilarity, combinedSimilarity, structuredSimilarity } from './similarity';
import { SnapshotStore } from './store';
import { BisectRunner } from './runner';
import { PromptSnapshot } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// --- Similarity tests ---

describe('stringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    assert.equal(stringSimilarity('hello world', 'hello world'), 1);
  });

  it('returns 0 for completely different strings', () => {
    const sim = stringSimilarity('aaa bbb', 'xxx yyy');
    assert.equal(sim, 0);
  });

  it('returns 1 for two empty strings', () => {
    assert.equal(stringSimilarity('', ''), 1);
  });

  it('returns partial for similar strings', () => {
    const sim = stringSimilarity('the cat sat on the mat', 'the cat sat on a mat');
    assert.ok(sim > 0.7);
    assert.ok(sim < 1);
  });

  it('is case insensitive', () => {
    assert.equal(stringSimilarity('Hello World', 'hello world'), 1);
  });

  it('handles one empty string', () => {
    assert.equal(stringSimilarity('hello', ''), 0);
    assert.equal(stringSimilarity('', 'hello'), 0);
  });
});

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    assert.equal(levenshteinSimilarity('abc', 'abc'), 1);
  });

  it('returns 0 for completely different single chars', () => {
    assert.equal(levenshteinSimilarity('a', 'b'), 0);
  });

  it('returns high similarity for small edits', () => {
    const sim = levenshteinSimilarity('kitten', 'sitten');
    assert.ok(sim >= 0.8);
  });
});

describe('combinedSimilarity', () => {
  it('averages string and levenshtein similarity', () => {
    const a = 'hello world';
    const b = 'hello world!';
    const combined = combinedSimilarity(a, b);
    assert.ok(combined > 0.8);
    assert.ok(combined <= 1);
  });
});

describe('structuredSimilarity', () => {
  it('compares JSON objects field by field', () => {
    const a = JSON.stringify({ name: 'test', count: 5, active: true });
    const b = JSON.stringify({ name: 'test', count: 5, active: true });
    assert.equal(structuredSimilarity(a, b), 1);
  });

  it('detects field changes', () => {
    const a = JSON.stringify({ name: 'test', count: 5 });
    const b = JSON.stringify({ name: 'other', count: 5 });
    const sim = structuredSimilarity(a, b);
    assert.ok(sim > 0.3);
    assert.ok(sim < 1);
  });

  it('falls back to string comparison for non-JSON', () => {
    const sim = structuredSimilarity('plain text', 'plain text');
    assert.equal(sim, 1);
  });

  it('handles nested objects', () => {
    const a = JSON.stringify({ user: { name: 'alice', age: 30 } });
    const b = JSON.stringify({ user: { name: 'alice', age: 31 } });
    const sim = structuredSimilarity(a, b);
    assert.ok(sim > 0.5);
    assert.ok(sim < 1);
  });

  it('handles arrays', () => {
    const a = JSON.stringify([1, 2, 3]);
    const b = JSON.stringify([1, 2, 3]);
    assert.equal(structuredSimilarity(a, b), 1);
  });

  it('gives partial credit for similar values', () => {
    const a = JSON.stringify({ desc: 'This is a long description about something' });
    const b = JSON.stringify({ desc: 'This is a long description about another thing' });
    const sim = structuredSimilarity(a, b);
    assert.ok(sim > 0.5);
    assert.ok(sim < 1);
  });
});

// --- Store tests ---

describe('SnapshotStore', () => {
  let tmpDir: string;
  let store: SnapshotStore;

  function makeSnapshot(overrides?: Partial<PromptSnapshot>): PromptSnapshot {
    return {
      id: 'test-1',
      prompt: 'Say hello',
      model: 'gpt-4',
      output: 'Hello!',
      timestamp: new Date().toISOString(),
      tags: ['greeting'],
      ...overrides,
    };
  }

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-test-'));
    store = new SnapshotStore({ snapshotsDir: tmpDir });
    store.init();
  }

  function cleanup() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it('initializes golden set file', () => {
    setup();
    const golden = store.load();
    assert.equal(golden.version, '1.0.0');
    assert.equal(golden.prompts.length, 0);
    cleanup();
  });

  it('adds and retrieves snapshots', () => {
    setup();
    const snap = makeSnapshot();
    store.add(snap);
    const loaded = store.get('test-1');
    assert.equal(loaded?.prompt, 'Say hello');
    assert.equal(loaded?.output, 'Hello!');
    cleanup();
  });

  it('updates existing snapshot by id', () => {
    setup();
    store.add(makeSnapshot({ output: 'Hello!' }));
    store.add(makeSnapshot({ output: 'Hi there!' }));
    const loaded = store.get('test-1');
    assert.equal(loaded?.output, 'Hi there!');
    assert.equal(store.list().length, 1);
    cleanup();
  });

  it('removes snapshots', () => {
    setup();
    store.add(makeSnapshot());
    assert.equal(store.remove('test-1'), true);
    assert.equal(store.get('test-1'), undefined);
    assert.equal(store.remove('nonexistent'), false);
    cleanup();
  });

  it('filters by tag', () => {
    setup();
    store.add(makeSnapshot({ id: 'a', tags: ['greeting'] }));
    store.add(makeSnapshot({ id: 'b', tags: ['farewell'] }));
    store.add(makeSnapshot({ id: 'c', tags: ['greeting', 'formal'] }));
    assert.equal(store.list({ tag: 'greeting' }).length, 2);
    assert.equal(store.list({ tag: 'farewell' }).length, 1);
    cleanup();
  });

  it('filters by model', () => {
    setup();
    store.add(makeSnapshot({ id: 'a', model: 'gpt-4' }));
    store.add(makeSnapshot({ id: 'b', model: 'claude-3' }));
    assert.equal(store.list({ model: 'gpt-4' }).length, 1);
    cleanup();
  });

  it('saves and loads history', () => {
    setup();
    store.add(makeSnapshot());
    store.saveHistory(makeSnapshot({ output: 'Hello v1', timestamp: '2026-01-01T00:00:00Z' }));
    store.saveHistory(makeSnapshot({ output: 'Hello v2', timestamp: '2026-02-01T00:00:00Z' }));
    const history = store.loadHistory('test-1');
    assert.equal(history.length, 2);
    assert.equal(history[0].output, 'Hello v1');
    assert.equal(history[1].output, 'Hello v2');
    cleanup();
  });

  it('imports from JSON file', () => {
    setup();
    const importFile = path.join(tmpDir, 'import.json');
    const data = [
      { id: 'imp-1', prompt: 'test', output: 'out1', model: 'gpt-4', timestamp: new Date().toISOString() },
      { id: 'imp-2', prompt: 'test2', output: 'out2', model: 'gpt-4', timestamp: new Date().toISOString() },
    ];
    fs.writeFileSync(importFile, JSON.stringify(data));
    const added = store.import(importFile);
    assert.equal(added, 2);
    assert.equal(store.list().length, 2);
    cleanup();
  });

  it('exports golden set', () => {
    setup();
    store.add(makeSnapshot());
    const exportFile = path.join(tmpDir, 'export.json');
    store.export(exportFile);
    const exported = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
    assert.equal(exported.prompts.length, 1);
    cleanup();
  });
});

// --- Runner tests ---

describe('BisectRunner', () => {
  let tmpDir: string;
  let store: SnapshotStore;
  let runner: BisectRunner;

  function setup() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-run-'));
    store = new SnapshotStore({ snapshotsDir: tmpDir });
    store.init();
    runner = new BisectRunner({ snapshotsDir: tmpDir, threshold: 0.8 });
  }

  function cleanup() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it('compares outputs against golden set', () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'Say hi',
      model: 'gpt-4',
      output: 'Hello, world!',
      timestamp: new Date().toISOString(),
    });
    store.add({
      id: 'p2',
      prompt: 'Summarize',
      model: 'gpt-4',
      output: 'A short summary of the text.',
      timestamp: new Date().toISOString(),
    });

    const result = runner.compare([
      { id: 'p1', output: 'Hello, world!' },         // exact match
      { id: 'p2', output: 'A completely different summary about something else entirely.' },
    ]);

    assert.equal(result.total, 2);
    assert.equal(result.passed, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.diffs[0].status, 'match');
    assert.equal(result.diffs[1].status, 'drift');
    cleanup();
  });

  it('reports errors for missing outputs', () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'expected',
      timestamp: new Date().toISOString(),
    });

    const result = runner.compare([]);
    assert.equal(result.total, 1);
    assert.equal(result.errors, 1);
    cleanup();
  });

  it('bisects through history to find regression point', () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'The quick brown fox jumps over the lazy dog',
      timestamp: new Date().toISOString(),
    });

    // Simulate history: first matching, then drifting
    store.saveHistory({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'The quick brown fox jumps over the lazy dog',
      timestamp: '2026-01-01T00:00:00Z',
    });
    store.saveHistory({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'The quick brown fox jumps over the lazy dog',
      timestamp: '2026-02-01T00:00:00Z',
    });
    store.saveHistory({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'Something completely different and unrelated at all',
      timestamp: '2026-03-01T00:00:00Z',
    });
    store.saveHistory({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'Yet another completely different output than before',
      timestamp: '2026-04-01T00:00:00Z',
    });

    const result = runner.bisect('p1');
    assert.ok(result);
    assert.equal(result!.points.length, 4);
    assert.ok(result!.regressionAt);
    assert.equal(result!.regressionAt, '2026-03-01T00:00:00Z');
    assert.equal(result!.points[0].changed, false);
    assert.equal(result!.points[1].changed, false);
    assert.equal(result!.points[2].changed, true);
    cleanup();
  });

  it('returns null for bisect with no history', () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'expected',
      timestamp: new Date().toISOString(),
    });

    const result = runner.bisect('p1');
    assert.equal(result, null);
    cleanup();
  });

  it('uses structured comparison method', () => {
    setup();
    const structuredRunner = new BisectRunner({ snapshotsDir: tmpDir, threshold: 0.8, method: 'structured' });

    store.add({
      id: 'p1',
      prompt: 'generate config',
      model: 'gpt-4',
      output: JSON.stringify({ name: 'app', port: 3000, debug: false }),
      timestamp: new Date().toISOString(),
    });

    const result = structuredRunner.compare([
      { id: 'p1', output: JSON.stringify({ name: 'app', port: 3000, debug: true }) },
    ]);

    // One field changed out of 3 — similarity ~0.67, below 0.8 threshold
    assert.equal(result.failed, 1);
    assert.ok(result.diffs[0].similarity < 0.8);
    cleanup();
  });

  it('run method with async fetchOutput', async () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'Hello!',
      timestamp: new Date().toISOString(),
    });

    const result = await runner.run(async (snap) => {
      return 'Hello!'; // exact match
    });

    assert.equal(result.total, 1);
    assert.equal(result.passed, 1);
    cleanup();
  });

  it('run method handles fetch errors', async () => {
    setup();
    store.add({
      id: 'p1',
      prompt: 'test',
      model: 'gpt-4',
      output: 'Hello!',
      timestamp: new Date().toISOString(),
    });

    const result = await runner.run(async () => {
      throw new Error('API timeout');
    });

    assert.equal(result.total, 1);
    assert.equal(result.errors, 1);
    assert.ok(result.diffs[0].details?.includes('API timeout'));
    cleanup();
  });
});
