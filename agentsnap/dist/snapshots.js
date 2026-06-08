"use strict";
/**
 * Snapshot manager — CRUD for snapshots
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
exports.init = init;
exports.loadConfig = loadConfig;
exports.createSnapshot = createSnapshot;
exports.listSnapshots = listSnapshots;
exports.loadSnapshot = loadSnapshot;
exports.deleteSnapshot = deleteSnapshot;
exports.findSnapshotsByTask = findSnapshotsByTask;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const recorder_js_1 = require("./recorder.js");
const DEFAULT_CONFIG = {
    snapshotsDir: '.agentsnap',
    defaultFormat: 'auto',
    similarityThreshold: 0.7,
    ignoreTools: [],
    ignorePaths: [],
};
/** Initialize agentsnap in a project */
function init(projectDir) {
    const configPath = path.join(projectDir, 'agentsnap.json');
    const snapDir = path.join(projectDir, DEFAULT_CONFIG.snapshotsDir);
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    fs.mkdirSync(snapDir, { recursive: true });
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gi = fs.readFileSync(gitignorePath, 'utf-8');
        if (!gi.includes('.agentsnap')) {
            fs.appendFileSync(gitignorePath, '\n.agentsnap/\n');
        }
    }
    const config = { ...DEFAULT_CONFIG };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return config;
}
/** Load config */
function loadConfig(projectDir) {
    const configPath = path.join(projectDir, 'agentsnap.json');
    if (!fs.existsSync(configPath))
        return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
}
/** Save a session as a named snapshot */
function createSnapshot(projectDir, session, tags = []) {
    const config = loadConfig(projectDir);
    const snapDir = path.join(projectDir, config.snapshotsDir);
    const sessionFile = (0, recorder_js_1.saveSession)(session, snapDir);
    const meta = {
        id: session.id,
        task: session.task,
        agent: session.agent,
        format: session.format,
        createdAt: new Date().toISOString(),
        sessionFile: path.relative(projectDir, sessionFile),
        tags,
    };
    const metaPath = path.join(snapDir, `${session.id}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    return meta;
}
/** List all snapshots */
function listSnapshots(projectDir) {
    const config = loadConfig(projectDir);
    const snapDir = path.join(projectDir, config.snapshotsDir);
    if (!fs.existsSync(snapDir))
        return [];
    const metas = [];
    for (const file of fs.readdirSync(snapDir)) {
        if (file.endsWith('.meta.json')) {
            metas.push(JSON.parse(fs.readFileSync(path.join(snapDir, file), 'utf-8')));
        }
    }
    return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
/** Load a snapshot by ID */
function loadSnapshot(projectDir, id) {
    const config = loadConfig(projectDir);
    const snapDir = path.join(projectDir, config.snapshotsDir);
    const metaPath = path.join(snapDir, `${id}.meta.json`);
    if (!fs.existsSync(metaPath))
        return null;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const sessionPath = path.join(projectDir, meta.sessionFile);
    if (!fs.existsSync(sessionPath))
        return null;
    const session = (0, recorder_js_1.loadSession)(sessionPath);
    return { meta, session };
}
/** Delete a snapshot by ID */
function deleteSnapshot(projectDir, id) {
    const config = loadConfig(projectDir);
    const snapDir = path.join(projectDir, config.snapshotsDir);
    const metaPath = path.join(snapDir, `${id}.meta.json`);
    const sessionPath = path.join(snapDir, `${id}.jsonl`);
    let deleted = false;
    if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        deleted = true;
    }
    if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
        deleted = true;
    }
    return deleted;
}
/** Find snapshots by task name */
function findSnapshotsByTask(projectDir, task) {
    return listSnapshots(projectDir).filter(s => s.task.toLowerCase().includes(task.toLowerCase()));
}
