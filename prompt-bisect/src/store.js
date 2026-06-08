"use strict";
// prompt-bisect: Snapshot store — file-based golden set management
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
exports.SnapshotStore = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const types_1 = require("./types");
class SnapshotStore {
    config;
    constructor(config) {
        this.config = { ...types_1.DEFAULT_CONFIG, ...config };
    }
    /** Initialize the snapshots directory and golden set file. */
    init() {
        const dir = this.config.snapshotsDir;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const goldenPath = this.goldenPath();
        if (!fs.existsSync(goldenPath)) {
            const golden = {
                version: '1.0.0',
                created: new Date().toISOString(),
                prompts: [],
            };
            fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2), 'utf-8');
        }
    }
    /** Load the golden set from disk. */
    load() {
        const goldenPath = this.goldenPath();
        if (!fs.existsSync(goldenPath)) {
            throw new Error(`Golden set not found at ${goldenPath}. Run 'init' first.`);
        }
        return JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
    }
    /** Save the golden set to disk. */
    save(golden) {
        fs.writeFileSync(this.goldenPath(), JSON.stringify(golden, null, 2), 'utf-8');
    }
    /** Add a snapshot to the golden set. */
    add(snapshot) {
        const golden = this.load();
        // Check for duplicate id
        const existing = golden.prompts.findIndex(p => p.id === snapshot.id);
        if (existing >= 0) {
            golden.prompts[existing] = snapshot;
        }
        else {
            golden.prompts.push(snapshot);
        }
        this.save(golden);
    }
    /** Remove a snapshot by id. */
    remove(id) {
        const golden = this.load();
        const idx = golden.prompts.findIndex(p => p.id === id);
        if (idx < 0)
            return false;
        golden.prompts.splice(idx, 1);
        this.save(golden);
        return true;
    }
    /** Get a snapshot by id. */
    get(id) {
        return this.load().prompts.find(p => p.id === id);
    }
    /** List all snapshots, optionally filtered by tag or model. */
    list(filters) {
        const golden = this.load();
        let results = golden.prompts;
        if (filters?.tag) {
            results = results.filter(p => p.tags?.includes(filters.tag));
        }
        if (filters?.model) {
            results = results.filter(p => p.model === filters.model);
        }
        return results;
    }
    /** Save a history snapshot (for bisect tracking). */
    saveHistory(snapshot) {
        const historyDir = path.join(this.config.snapshotsDir, 'history');
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }
        const filename = `${snapshot.id}__${snapshot.timestamp.replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(path.join(historyDir, filename), JSON.stringify(snapshot, null, 2), 'utf-8');
    }
    /** Load all history snapshots, sorted by timestamp. */
    loadHistory(promptId) {
        const historyDir = path.join(this.config.snapshotsDir, 'history');
        if (!fs.existsSync(historyDir))
            return [];
        const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
        const snapshots = [];
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(historyDir, file), 'utf-8'));
            if (!promptId || data.id === promptId) {
                snapshots.push(data);
            }
        }
        return snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    /** Import snapshots from a JSON file. */
    import(filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const snapshots = Array.isArray(data) ? data : data.prompts ?? [data];
        const golden = this.load();
        let added = 0;
        for (const snap of snapshots) {
            if (!snap.id || !snap.prompt || !snap.output)
                continue;
            const existing = golden.prompts.findIndex(p => p.id === snap.id);
            if (existing >= 0) {
                golden.prompts[existing] = snap;
            }
            else {
                golden.prompts.push(snap);
                added++;
            }
        }
        this.save(golden);
        return added;
    }
    /** Export golden set to a file. */
    export(outputPath) {
        const golden = this.load();
        fs.writeFileSync(outputPath, JSON.stringify(golden, null, 2), 'utf-8');
    }
    goldenPath() {
        return path.join(this.config.snapshotsDir, 'golden.json');
    }
}
exports.SnapshotStore = SnapshotStore;
//# sourceMappingURL=store.js.map