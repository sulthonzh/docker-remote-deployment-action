"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
exports.createMigrationFile = createMigrationFile;
exports.loadMigrations = loadMigrations;
exports.formatTimestamp = formatTimestamp;
exports.formatDuration = formatDuration;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readConfig(configPath = './.dbmigrate.json') {
    try {
        const content = fs_1.default.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        // Validate required fields
        const required = ['driver', 'database', 'migrationsDir'];
        for (const field of required) {
            if (!config[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        // Validate driver
        const validDrivers = ['sqlite', 'postgresql', 'mysql'];
        if (!validDrivers.includes(config.driver)) {
            throw new Error(`Invalid driver: ${config.driver}. Must be one of: ${validDrivers.join(', ')}`);
        }
        // Set defaults
        return {
            tableName: config.tableName || 'schema_migrations',
            transaction: config.transaction !== false,
            ...config,
        };
    }
    catch (error) {
        throw new Error(`Failed to read config: ${error.message}`);
    }
}
function writeConfig(config, configPath = './.dbmigrate.json') {
    try {
        fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    catch (error) {
        throw new Error(`Failed to write config: ${error.message}`);
    }
}
function createMigrationFile(config, description) {
    const timestamp = Date.now();
    const version = timestamp.toString().padStart(14, '0');
    const filename = `${version}_${description}.sql`;
    const filepath = path_1.default.join(config.migrationsDir, filename);
    // Create migrations directory if it doesn't exist
    if (!fs_1.default.existsSync(config.migrationsDir)) {
        fs_1.default.mkdirSync(config.migrationsDir, { recursive: true });
    }
    // Create migration template
    const template = `-- Up migration
-- ${description}

-- Write your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id INTEGER PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Down migration (optional)
-- ${description} rollback

-- Write your rollback SQL here
-- Example:
-- DROP TABLE example;
`;
    fs_1.default.writeFileSync(filepath, template);
    return filepath;
}
function loadMigrations(config) {
    if (!fs_1.default.existsSync(config.migrationsDir)) {
        return [];
    }
    const files = fs_1.default.readdirSync(config.migrationsDir);
    const migrations = [];
    for (const file of files) {
        if (file.endsWith('.sql')) {
            const match = file.match(/^(\d{14})_(.+)\.sql$/);
            if (match) {
                const timestamp = parseInt(match[1]);
                const name = match[2];
                const filepath = path_1.default.join(config.migrationsDir, file);
                const content = fs_1.default.readFileSync(filepath, 'utf-8');
                const sections = content.split(/^-- (Down migration|Up migration)\b/m);
                let up = '';
                let down = '';
                if (sections.length >= 3) {
                    up = sections[sections.length - 1].trim();
                    if (sections.length >= 5) {
                        down = sections[1].trim();
                    }
                }
                else {
                    up = content.trim();
                }
                migrations.push({
                    timestamp,
                    name,
                    path: filepath,
                    version: timestamp.toString().padStart(14, '0'),
                    up,
                    down,
                });
            }
        }
    }
    // Sort by timestamp
    return migrations.sort((a, b) => a.timestamp - b.timestamp);
}
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().replace(/[:.]/g, '-');
}
function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    else {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}
//# sourceMappingURL=utils.js.map