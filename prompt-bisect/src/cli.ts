#!/usr/bin/env node
// prompt-bisect: CLI

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SnapshotStore } from './store';
import { BisectRunner } from './runner';
import { BisectConfig, DEFAULT_CONFIG, OutputFormat, PromptSnapshot, RunResult, BisectResult } from './types';

// --- Minimal arg parser ---
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  let i = 2; // skip node + script
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
    } else {
      i++;
    }
  }
  return result;
}

function getConfig(args: Record<string, string | boolean>): BisectConfig {
  return {
    ...DEFAULT_CONFIG,
    threshold: args.threshold ? parseFloat(args.threshold as string) : DEFAULT_CONFIG.threshold,
    method: (args.method as BisectConfig['method']) || DEFAULT_CONFIG.method,
    snapshotsDir: (args.dir as string) || DEFAULT_CONFIG.snapshotsDir,
  };
}

function getFormat(args: Record<string, string | boolean>): OutputFormat {
  if (args.json) return 'json';
  if (args.markdown) return 'markdown';
  return 'text';
}

function generateId(): string {
  return `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Formatters ---

function formatRunText(result: RunResult): string {
  const lines: string[] = [];
  lines.push(`\n  prompt-bisect results`);
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push(`  Total: ${result.total}  Passed: ${result.passed}  Failed: ${result.failed}  Errors: ${result.errors}`);
  lines.push(`  Duration: ${result.durationMs}ms`);
  lines.push('');

  for (const diff of result.diffs) {
    const icon = diff.status === 'match' ? '✓' : diff.status === 'drift' ? '✗' : '!';
    const color = diff.status === 'match' ? '' : diff.status === 'drift' ? '' : '';
    lines.push(`  ${icon} ${diff.promptId} — ${(diff.similarity * 100).toFixed(1)}% [${diff.status}]`);
    if (diff.details) {
      for (const line of diff.details.split('\n')) {
        lines.push(`    ${line}`);
      }
    }
  }

  lines.push('');
  if (result.failed > 0 || result.errors > 0) {
    lines.push(`  ⚠ ${result.failed + result.errors} prompt(s) need attention`);
  } else {
    lines.push(`  All prompts within threshold ✓`);
  }

  return lines.join('\n');
}

function formatRunMarkdown(result: RunResult): string {
  const lines: string[] = [];
  lines.push(`# Prompt Bisect Results`);
  lines.push('');
  lines.push(`- **Total:** ${result.total}`);
  lines.push(`- **Passed:** ${result.passed}`);
  lines.push(`- **Failed:** ${result.failed}`);
  lines.push(`- **Errors:** ${result.errors}`);
  lines.push(`- **Duration:** ${result.durationMs}ms`);
  lines.push('');
  lines.push('| Prompt | Similarity | Status | Details |');
  lines.push('|--------|-----------|--------|---------|');

  for (const diff of result.diffs) {
    const statusIcon = diff.status === 'match' ? '✅' : diff.status === 'drift' ? '❌' : '⚠️';
    lines.push(`| ${diff.promptId} | ${(diff.similarity * 100).toFixed(1)}% | ${statusIcon} ${diff.status} | ${diff.details?.split('\n')[0] || '-'} |`);
  }

  return lines.join('\n');
}

function formatBisectText(result: BisectResult): string {
  const lines: string[] = [];
  lines.push(`\n  Bisect: ${result.promptId}`);
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push('');

  for (const point of result.points) {
    const icon = point.changed ? '✗' : '✓';
    lines.push(`  ${icon} ${point.timestamp} — ${(point.similarity * 100).toFixed(1)}%`);
  }

  if (result.regressionAt) {
    lines.push('');
    lines.push(`  ⚠ First drift detected at: ${result.regressionAt}`);
  } else {
    lines.push('');
    lines.push(`  No drift detected across ${result.points.length} history points ✓`);
  }

  return lines.join('\n');
}

function formatBisectMarkdown(result: BisectResult): string {
  const lines: string[] = [];
  lines.push(`# Bisect: ${result.promptId}`);
  lines.push('');
  lines.push('| Timestamp | Similarity | Changed |');
  lines.push('|-----------|-----------|---------|');

  for (const point of result.points) {
    lines.push(`| ${point.timestamp} | ${(point.similarity * 100).toFixed(1)}% | ${point.changed ? '❌ Yes' : '✅ No'} |`);
  }

  if (result.regressionAt) {
    lines.push('');
    lines.push(`> ⚠ First drift detected at **${result.regressionAt}**`);
  }

  return lines.join('\n');
}

// --- Commands ---

function cmdInit(store: SnapshotStore, format: OutputFormat): void {
  try {
    store.init();
    if (format === 'json') {
      console.log(JSON.stringify({ status: 'initialized', dir: store['config'].snapshotsDir }));
    } else {
      console.log(`✓ Initialized prompt-bisect in ${store['config'].snapshotsDir}/`);
      console.log(`Ready to add your first prompt with: prompt-bisect add --prompt "..." --output "..."`);
    }
  } catch (err) {
    console.error(`Error initializing prompt-bisect:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdAdd(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const prompt = args.prompt as string;
  const output = args.output as string;
  const model = (args.model as string) || 'unknown';
  const id = (args.id as string) || generateId();
  const tags = args.tags ? (args.tags as string).split(',') : [];

  if (!prompt || !output) {
    console.error('Error: --prompt and --output are required');
    console.log('Usage: prompt-bisect add --prompt "..." --output "..." [--model ...] [--id ...] [--tags a,b]');
    process.exit(1);
  }

  // If output is a file path, read it
  let outputText = output;
  if (fs.existsSync(output)) {
    try {
      outputText = fs.readFileSync(output, 'utf-8');
      if (!outputText.trim()) {
        throw new Error('Output file is empty');
      }
    } catch (err) {
      console.error(`Error reading output file ${output}:`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  // Same for prompt
  let promptText = prompt;
  if (fs.existsSync(prompt)) {
    try {
      promptText = fs.readFileSync(prompt, 'utf-8');
      if (!promptText.trim()) {
        throw new Error('Prompt file is empty');
      }
    } catch (err) {
      console.error(`Error reading prompt file ${prompt}:`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  if (!promptText.trim()) {
    console.error('Error: Prompt text cannot be empty');
    process.exit(1);
  }

  if (!outputText.trim()) {
    console.error('Error: Output text cannot be empty');
    process.exit(1);
  }

  const snapshot: PromptSnapshot = {
    id,
    prompt: promptText,
    model,
    output: outputText,
    timestamp: new Date().toISOString(),
    tags,
  };

  try {
    store.add(snapshot);
    if (format === 'json') {
      console.log(JSON.stringify({ status: 'added', id: snapshot.id }));
    } else {
      console.log(`✓ Added snapshot: ${id}`);
    }
  } catch (err) {
    console.error(`Error adding snapshot:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdList(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const snapshots = store.list({
    tag: args.tag as string,
    model: args.model as string,
  });

  if (format === 'json') {
    console.log(JSON.stringify(snapshots, null, 2));
    return;
  }

  if (format === 'markdown') {
    console.log('# Prompt Snapshots\n');
    console.log('| ID | Model | Tags | Created |');
    console.log('|----|-------|------|---------|');
    for (const s of snapshots) {
      console.log(`| ${s.id} | ${s.model} | ${s.tags?.join(', ') || '-'} | ${s.timestamp} |`);
    }
    return;
  }

  if (snapshots.length === 0) {
    console.log('No snapshots found. Use `prompt-bisect add` to add your first prompt.');
    return;
  }

  console.log(`\n  ${snapshots.length} snapshot(s):\n`);
  
  // Group by model for better readability
  const byModel = snapshots.reduce((acc, s) => {
    if (!acc[s.model]) acc[s.model] = [];
    acc[s.model].push(s);
    return acc;
  }, {} as Record<string, typeof snapshots>);

  for (const [model, modelSnapshots] of Object.entries(byModel)) {
    console.log(`  ${model} (${modelSnapshots.length}):`);
    for (const s of modelSnapshots) {
      const tagStr = s.tags?.length ? `[${s.tags.join(', ')}] ` : '';
      console.log(`    ${s.id} ${tagStr}${s.timestamp}`);
    }
    console.log('');
  }
}

function cmdRemove(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const id = args.id as string;
  if (!id) {
    console.error('Error: --id is required');
    console.log('Usage: prompt-bisect remove --id <snapshot-id>');
    process.exit(1);
  }

  try {
    const removed = store.remove(id);
    if (format === 'json') {
      console.log(JSON.stringify({ status: removed ? 'removed' : 'not_found', id }));
    } else {
      console.log(removed ? `✓ Removed ${id}` : `✗ Not found: ${id}`);
    }
  } catch (err) {
    console.error(`Error removing snapshot ${id}:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdCompare(store: SnapshotStore, config: BisectConfig, args: Record<string, string | boolean>, format: OutputFormat): void {
  const file = args.file as string;
  if (!file) {
    console.error('Error: --file is required');
    console.log('Usage: prompt-bisect compare --file <outputs.json> [--threshold 0.8] [--method string|structured]');
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const outputs: { id: string; output: string }[] = Array.isArray(data) ? data : data.outputs;

    if (!outputs || !Array.isArray(outputs)) {
      console.error('Error: Expected JSON array of { id, output }');
      process.exit(1);
    }

    // Check for empty outputs
    if (outputs.length === 0) {
      console.error('Error: No outputs provided in the file');
      process.exit(1);
    }

    const runner = new BisectRunner(config);
    const result = runner.compare(outputs);

    // Exit with non-zero code if any prompts failed
    if (format !== 'json' && (result.failed > 0 || result.errors > 0)) {
      outputResult(result, format, 'run');
      process.exit(1);
    }

    outputResult(result, format, 'run');
  } catch (err) {
    console.error('Error comparing outputs:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdBisect(store: SnapshotStore, config: BisectConfig, args: Record<string, string | boolean>, format: OutputFormat): void {
  const promptId = args.id as string;
  if (!promptId) {
    console.error('Error: --id is required');
    console.log('Usage: prompt-bisect bisect --id <prompt-id> [--threshold 0.8]');
    process.exit(1);
  }

  try {
    const runner = new BisectRunner(config);
    const result = runner.bisect(promptId);

    if (!result) {
      console.error(`No history found for prompt: ${promptId}`);
      console.log('Tip: Run some comparisons first to build history');
      process.exit(1);
    }

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (format === 'markdown') {
      console.log(formatBisectMarkdown(result));
    } else {
      console.log(formatBisectText(result));
    }
  } catch (err) {
    console.error(`Error running bisect for ${promptId}:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdImport(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const file = args.file as string;
  if (!file) {
    console.error('Error: --file is required');
    console.log('Usage: prompt-bisect import --file <snapshots.json>');
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  try {
    const added = store.import(file);
    if (format === 'json') {
      console.log(JSON.stringify({ status: 'imported', added }));
    } else {
      console.log(`✓ Imported ${added} new snapshot(s)`);
    }
  } catch (err) {
    console.error(`Error importing snapshots:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function cmdStats(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const golden = store.load();
  const snapshots = golden.prompts;
  
  if (snapshots.length === 0) {
    if (format === 'json') {
      console.log(JSON.stringify({ total: 0, models: {}, tags: {} }));
    } else {
      console.log('No snapshots found.');
    }
    return;
  }
  
  // Calculate statistics
  const models = snapshots.reduce((acc, s) => {
    acc[s.model] = (acc[s.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const tags = snapshots.reduce((acc, s) => {
    s.tags?.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  const avgPromptLength = snapshots.reduce((sum, s) => sum + s.prompt.length, 0) / snapshots.length;
  const avgOutputLength = snapshots.reduce((sum, s) => sum + s.output.length, 0) / snapshots.length;
  
  if (format === 'json') {
    console.log(JSON.stringify({
      total: snapshots.length,
      models,
      tags,
      avgPromptLength: Math.round(avgPromptLength),
      avgOutputLength: Math.round(avgOutputLength),
      createdAt: golden.created,
    }, null, 2));
    return;
  }
  
  // Text output
  console.log(`\n  Prompt Bisect Statistics\n  ${'─'.repeat(40)}`);
  console.log(`  Total prompts: ${snapshots.length}`);
  console.log(`  Created: ${new Date(golden.created).toLocaleDateString()}`);
  console.log(`\n  By Model:`);
  Object.entries(models).forEach(([model, count]) => {
    console.log(`    ${model}: ${count}`);
  });
  
  const tagEntries = Object.entries(tags).sort(([,a], [,b]) => b - a);
  if (tagEntries.length > 0) {
    console.log(`\n  Top Tags:`);
    tagEntries.slice(0, 5).forEach(([tag, count]) => {
      console.log(`    ${tag}: ${count}`);
    });
  }
  
  console.log(`\n  Average prompt length: ${Math.round(avgPromptLength)} chars`);
  console.log(`  Average output length: ${Math.round(avgOutputLength)} chars`);
}

function cmdExport(store: SnapshotStore, args: Record<string, string | boolean>, format: OutputFormat): void {
  const file = (args.file as string) || 'golden-export.json';
  
  try {
    store.export(file);
    if (format === 'json') {
      console.log(JSON.stringify({ status: 'exported', file }));
    } else {
      console.log(`✓ Exported golden set to ${file}`);
    }
  } catch (err) {
    console.error(`Error exporting golden set:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function outputResult(result: RunResult | any, format: OutputFormat, type: 'run' | 'bisect'): void {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (format === 'markdown') {
    if (type === 'run') {
      console.log(formatRunMarkdown(result));
    } else {
      console.log(formatBisectMarkdown(result));
    }
  } else {
    if (type === 'run') {
      console.log(formatRunText(result));
    } else {
      console.log(formatBisectText(result));
    }
  }
}

// --- Main ---

function printHelp(): void {
  console.log(`
  prompt-bisect — CI regression testing for AI prompts
  The git bisect for prompt drift across model updates

  Commands:

    init                  Create snapshots directory and golden set
    add                   Add a prompt snapshot to golden set
    list                  List all snapshots
    stats                 Show statistics about your prompt set
    remove                Remove a snapshot from golden set
    compare               Compare new outputs against golden set
    bisect                Find when a prompt's output started drifting
    import                Import snapshots from JSON file
    export                Export golden set to JSON file

  Usage Examples:

    # Initialize prompt-bisect
    prompt-bisect init
    prompt-bisect init --dir ./my-snapshots

    # Add a golden snapshot
    prompt-bisect add \
      --prompt "Summarize this in 3 sentences" \
      --output "This article discusses..." \
      --model gpt-4 \
      --id article-summarizer-v1 \
      --tags summarization,content

    # List snapshots with filter
    prompt-bisect list --tag summarization --json

    # View prompt set statistics
    prompt-bisect stats

    # Compare new outputs
    prompt-bisect compare --file outputs.json --threshold 0.85

    # Find when drift started
    prompt-bisect bisect --id article-summarizer-v1

  Options:
    --threshold <float>    Similarity threshold 0.0-1.0 (default: 0.8)
    --method <type>       Comparison method: string, structured (default: string)
    --dir <path>          Snapshots directory (default: .prompt-snapshots)
    --json                Machine-readable JSON output
    --markdown            Markdown formatted output

  For more help, see: https://github.com/sulthonzh/prompt-bisect
`);
  process.exit(0);
}

function main(): void {
  const args = parseArgs(process.argv);
  const command = process.argv[2];

  if (!command || command.startsWith('--') || command === 'help' || command === '--help') {
    printHelp();
  }

  const config = getConfig(args);
  const store = new SnapshotStore(config);
  const format = getFormat(args);

  switch (command) {
    case 'init':
      cmdInit(store, format);
      break;
    case 'add':
      cmdAdd(store, args, format);
      break;
    case 'list':
      cmdList(store, args, format);
      break;
    case 'stats':
      cmdStats(store, args, format);
      break;
    case 'remove':
      cmdRemove(store, args, format);
      break;
    case 'compare':
      cmdCompare(store, config, args, format);
      break;
    case 'bisect':
      cmdBisect(store, config, args, format);
      break;
    case 'import':
      cmdImport(store, args, format);
      break;
    case 'export':
      cmdExport(store, args, format);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Use "prompt-bisect help" for usage information');
      process.exit(1);
  }
}

main();
