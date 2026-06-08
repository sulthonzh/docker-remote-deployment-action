"use strict";
/**
 * Tests for agentsnap
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
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const recorder_js_1 = require("./recorder.js");
const differ_js_1 = require("./differ.js");
const snapshots_js_1 = require("./snapshots.js");
(async () => {
    // Helper: create a mock session
    function mockSession(overrides = {}) {
        return {
            id: 'snap_test_001',
            agent: 'test-agent',
            format: 'generic',
            task: 'add auth middleware',
            startedAt: '2026-05-31T03:00:00Z',
            endedAt: '2026-05-31T03:01:00Z',
            events: [],
            toolCalls: [],
            filesRead: [],
            filesWritten: [],
            filesModified: [],
            totalDuration_ms: 60000,
            errorCount: 0,
            success: true,
            metadata: {},
            ...overrides,
        };
    }
    // --- Recorder tests ---
    await (async function testParseLineGeneric() {
        const line = JSON.stringify({ type: 'tool_call', timestamp: '2026-05-31T03:00:00Z', data: { tool: 'read', input: { path: 'src/index.ts' } } });
        const event = (0, recorder_js_1.parseLine)(line);
        assert.ok(event);
        assert.strictEqual(event.type, 'tool_call');
        assert.strictEqual(event.data.tool, 'read');
        console.log('✓ parseLine — generic format');
    })();
    await (async function testParseLineSkipsEmpty() {
        assert.strictEqual((0, recorder_js_1.parseLine)(''), null);
        assert.strictEqual((0, recorder_js_1.parseLine)('  '), null);
        assert.strictEqual((0, recorder_js_1.parseLine)('# comment'), null);
        console.log('✓ parseLine — skips empty/comment lines');
    })();
    await (async function testDetectFormat() {
        assert.strictEqual((0, recorder_js_1.detectFormat)(JSON.stringify({ type: 'tool_call', tool: 'read', timestamp: '' })), 'generic');
        assert.strictEqual((0, recorder_js_1.detectFormat)(JSON.stringify({ role: 'assistant', content: [] })), 'claude-code');
        assert.strictEqual((0, recorder_js_1.detectFormat)(JSON.stringify({ type: 'response', model: 'gpt-4' })), 'codex');
        assert.strictEqual((0, recorder_js_1.detectFormat)('not json'), 'generic');
        console.log('✓ detectFormat — all formats');
    })();
    await (async function testExtractToolCalls() {
        const events = [
            { type: 'tool_call', timestamp: '', data: { id: 'tc_1', tool: 'read', input: { path: 'a.ts' } } },
            { type: 'message', timestamp: '', data: {} },
            { type: 'tool_call', timestamp: '', data: { id: 'tc_2', tool: 'write', input: { path: 'b.ts' }, output: 'done' } },
        ];
        const calls = (0, recorder_js_1.extractToolCalls)(events);
        assert.strictEqual(calls.length, 2);
        assert.strictEqual(calls[0].tool, 'read');
        assert.strictEqual(calls[1].tool, 'write');
        console.log('✓ extractToolCalls');
    })();
    await (async function testBuildSession() {
        const events = [
            { type: 'tool_call', timestamp: '2026-05-31T03:00:00Z', data: { id: '1', tool: 'read', input: { path: 'src/a.ts' } } },
            { type: 'tool_call', timestamp: '2026-05-31T03:00:01Z', data: { id: '2', tool: 'write', input: { path: 'src/b.ts' }, output: 'ok' } },
            { type: 'error', timestamp: '2026-05-31T03:00:02Z', data: { message: 'oops' } },
        ];
        const session = (0, recorder_js_1.buildSession)(events, 'test task', 'test-agent', 'generic');
        assert.strictEqual(session.task, 'test task');
        assert.strictEqual(session.agent, 'test-agent');
        assert.strictEqual(session.toolCalls.length, 2);
        assert.strictEqual(session.filesRead.length, 1);
        assert.strictEqual(session.filesWritten.length, 1);
        assert.strictEqual(session.errorCount, 1);
        assert.strictEqual(session.success, false);
        console.log('✓ buildSession');
    })();
    await (async function testRecordFromText() {
        const jsonl = [
            JSON.stringify({ type: 'tool_call', timestamp: '2026-05-31T03:00:00Z', data: { id: '1', tool: 'read', input: { path: 'index.ts' } } }),
            JSON.stringify({ type: 'tool_call', timestamp: '2026-05-31T03:00:01Z', data: { id: '2', tool: 'write', input: { path: 'out.ts' }, output: 'ok' } }),
        ].join('\n');
        const session = (0, recorder_js_1.recordFromText)(jsonl, 'test', 'agent');
        assert.strictEqual(session.events.length, 2);
        assert.strictEqual(session.toolCalls.length, 2);
        console.log('✓ recordFromText');
    })();
    // --- Differ tests ---
    await (async function testDiffIdenticalSessions() {
        const session = mockSession({
            toolCalls: [
                { id: 'tc_1', tool: 'read', input: { path: 'a.ts' }, timestamp: '', success: true },
                { id: 'tc_2', tool: 'write', input: { path: 'b.ts' }, timestamp: '', success: true },
            ],
        });
        const diff = (0, differ_js_1.diffSessions)(session, session);
        assert.strictEqual(diff.summary.similarityScore, 1.0);
        assert.strictEqual(diff.summary.toolCallsAdded, 0);
        assert.strictEqual(diff.summary.toolCallsRemoved, 0);
        assert.strictEqual(diff.regressionDetected, false);
        console.log('✓ diff identical sessions — no regression');
    })();
    await (async function testDiffRemovedToolCalls() {
        const base = mockSession({
            toolCalls: [
                { id: 'tc_1', tool: 'read', input: { path: 'a.ts' }, timestamp: '', success: true },
                { id: 'tc_2', tool: 'write', input: { path: 'b.ts' }, timestamp: '', success: true },
            ],
        });
        const curr = mockSession({
            id: 'snap_test_002',
            toolCalls: [
                { id: 'tc_1', tool: 'read', input: { path: 'a.ts' }, timestamp: '', success: true },
            ],
        });
        const diff = (0, differ_js_1.diffSessions)(base, curr);
        assert.strictEqual(diff.summary.toolCallsRemoved, 1);
        assert.ok(diff.summary.similarityScore < 1);
        console.log('✓ diff — removed tool calls detected');
    })();
    await (async function testDiffSuccessChanged() {
        const base = mockSession({ success: true, errorCount: 0 });
        const curr = mockSession({ id: 'snap_test_002', success: false, errorCount: 3 });
        const diff = (0, differ_js_1.diffSessions)(base, curr);
        assert.strictEqual(diff.summary.successChanged, true);
        assert.strictEqual(diff.summary.errorCountDiff, 3);
        assert.strictEqual(diff.regressionDetected, true);
        console.log('✓ diff — success change is regression');
    })();
    await (async function testComputeSimilarity() {
        const s1 = mockSession({
            toolCalls: [
                { id: '1', tool: 'read', input: { path: 'a' }, timestamp: '', success: true },
                { id: '2', tool: 'write', input: { path: 'b' }, timestamp: '', success: true },
            ],
        });
        const s2 = mockSession({
            toolCalls: [
                { id: '1', tool: 'read', input: { path: 'a' }, timestamp: '', success: true },
            ],
        });
        const sim = (0, differ_js_1.computeSimilarity)(s1, s2);
        assert.ok(sim > 0 && sim < 1);
        console.log('✓ computeSimilarity — partial overlap');
    })();
    await (async function testComputeSimilarityEmpty() {
        const s1 = mockSession({ toolCalls: [] });
        const s2 = mockSession({ toolCalls: [] });
        assert.strictEqual((0, differ_js_1.computeSimilarity)(s1, s2), 1.0);
        console.log('✓ computeSimilarity — both empty');
    })();
    await (async function testDetectRegressions() {
        const base = mockSession({ success: true, toolCalls: [] });
        const curr = mockSession({ success: false, errorCount: 2, toolCalls: [] });
        const diff = (0, differ_js_1.diffSessions)(base, curr);
        assert.strictEqual(diff.regressionDetected, true);
        assert.ok(diff.regressionReasons.length >= 2);
        console.log('✓ detectRegressions — multiple reasons');
    })();
    // --- Snapshot manager tests ---
    await (async function testInit() {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentsnap-'));
        const config = (0, snapshots_js_1.init)(tmpDir);
        assert.strictEqual(config.snapshotsDir, '.agentsnap');
        assert.ok(fs.existsSync(path.join(tmpDir, 'agentsnap.json')));
        assert.ok(fs.existsSync(path.join(tmpDir, '.agentsnap')));
        fs.rmSync(tmpDir, { recursive: true });
        console.log('✓ init');
    })();
    await (async function testCreateAndListSnapshots() {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentsnap-'));
        (0, snapshots_js_1.init)(tmpDir);
        const session = mockSession();
        const meta = (0, snapshots_js_1.createSnapshot)(tmpDir, session, ['baseline']);
        assert.strictEqual(meta.task, 'add auth middleware');
        assert.strictEqual(meta.tags[0], 'baseline');
        const list = (0, snapshots_js_1.listSnapshots)(tmpDir);
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].id, session.id);
        fs.rmSync(tmpDir, { recursive: true });
        console.log('✓ createSnapshot + listSnapshots');
    })();
    await (async function testLoadSnapshot() {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentsnap-'));
        (0, snapshots_js_1.init)(tmpDir);
        const session = mockSession();
        (0, snapshots_js_1.createSnapshot)(tmpDir, session);
        const loaded = (0, snapshots_js_1.loadSnapshot)(tmpDir, session.id);
        assert.ok(loaded);
        assert.strictEqual(loaded.meta.id, session.id);
        fs.rmSync(tmpDir, { recursive: true });
        console.log('✓ loadSnapshot');
    })();
    await (async function testDeleteSnapshot() {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentsnap-'));
        (0, snapshots_js_1.init)(tmpDir);
        const session = mockSession();
        (0, snapshots_js_1.createSnapshot)(tmpDir, session);
        assert.strictEqual((0, snapshots_js_1.deleteSnapshot)(tmpDir, session.id), true);
        assert.strictEqual((0, snapshots_js_1.deleteSnapshot)(tmpDir, session.id), false);
        assert.strictEqual((0, snapshots_js_1.listSnapshots)(tmpDir).length, 0);
        fs.rmSync(tmpDir, { recursive: true });
        console.log('✓ deleteSnapshot');
    })();
    await (async function testFindByTask() {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentsnap-'));
        (0, snapshots_js_1.init)(tmpDir);
        (0, snapshots_js_1.createSnapshot)(tmpDir, mockSession({ task: 'add auth middleware' }));
        (0, snapshots_js_1.createSnapshot)(tmpDir, mockSession({ id: 'snap_test_002', task: 'fix login bug' }));
        (0, snapshots_js_1.createSnapshot)(tmpDir, mockSession({ id: 'snap_test_003', task: 'add auth middleware' }));
        const results = (0, snapshots_js_1.findSnapshotsByTask)(tmpDir, 'auth');
        assert.strictEqual(results.length, 2);
        fs.rmSync(tmpDir, { recursive: true });
        console.log('✓ findSnapshotsByTask');
    })();
    await (async function testDiffSessionsWithFiles() {
        const base = mockSession({
            toolCalls: [],
            filesRead: ['src/a.ts', 'src/b.ts'],
            filesWritten: ['src/c.ts'],
        });
        const curr = mockSession({
            id: 'snap_test_002',
            toolCalls: [],
            filesRead: ['src/a.ts', 'src/d.ts'],
            filesWritten: ['src/c.ts', 'src/e.ts'],
        });
        const diff = (0, differ_js_1.diffSessions)(base, curr);
        assert.strictEqual(diff.summary.filesAdded, 2); // d.ts, e.ts
        assert.strictEqual(diff.summary.filesRemoved, 1); // b.ts
        console.log('✓ diff — file changes');
    })();
    await (async function testDiffTiming() {
        const base = mockSession({ totalDuration_ms: 10000 });
        const curr = mockSession({ id: 'snap_test_002', totalDuration_ms: 15000 });
        const diff = (0, differ_js_1.diffSessions)(base, curr);
        assert.strictEqual(diff.timingDiff.diff_ms, 5000);
        assert.strictEqual(diff.timingDiff.percentChange, 50);
        console.log('✓ diff — timing');
    })();
    console.log(`\nAll 18 tests passed ✓`);
})();
