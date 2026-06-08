"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class DatabaseManager {
    db = null;
    config;
    constructor(config) {
        this.config = {
            dbPath: process.env.ACO_DB_PATH || path_1.default.join(process.cwd(), "usage.db"),
            ...config,
        };
    }
    async initialize() {
        try {
            // Ensure directory exists
            const dbDir = path_1.default.dirname(this.config.dbPath);
            await fs_1.promises.mkdir(dbDir, { recursive: true });
            // Initialize database
            this.db = new sqlite3_1.default.Database(this.config.dbPath);
            // Create tables
            await this.createTables();
            await this.createIndexes();
            console.log(`Database initialized at: ${this.config.dbPath}`);
        }
        catch (error) {
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }
    async createTables() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            const createTokenUsageTable = `
        CREATE TABLE IF NOT EXISTS token_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          input_tokens INTEGER NOT NULL,
          output_tokens INTEGER NOT NULL,
          total_tokens INTEGER NOT NULL,
          cost_usd REAL NOT NULL,
          timestamp TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          status TEXT NOT NULL,
          error_message TEXT
        )
      `;
            this.db.run(createTokenUsageTable, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async createIndexes() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            const indexes = [
                `CREATE INDEX IF NOT EXISTS idx_agent_id ON token_usage(agent_id)`,
                `CREATE INDEX IF NOT EXISTS idx_tool_name ON token_usage(tool_name)`,
                `CREATE INDEX IF NOT EXISTS idx_timestamp ON token_usage(timestamp)`,
                `CREATE INDEX IF NOT EXISTS idx_status ON token_usage(status)`,
                `CREATE INDEX IF NOT EXISTS idx_cost_usd ON token_usage(cost_usd)`,
                `CREATE INDEX IF NOT EXISTS idx_total_tokens ON token_usage(total_tokens)`,
            ];
            let completed = 0;
            indexes.forEach((index) => {
                this.db.run(index, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === indexes.length) {
                        resolve();
                    }
                });
            });
        });
    }
    async insertTokenUsage(record) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            const stmt = this.db.prepare(`
        INSERT INTO token_usage 
        (agent_id, tool_name, input_tokens, output_tokens, total_tokens, cost_usd, timestamp, duration_ms, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(record.agent_id, record.tool_name, record.input_tokens, record.output_tokens, record.total_tokens, record.cost_usd, record.timestamp, record.duration_ms, record.status, record.error_message, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    }
    async getTokenUsage(filters) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            let query = "SELECT * FROM token_usage WHERE 1=1";
            const params = [];
            if (filters.agent_id) {
                query += " AND agent_id = ?";
                params.push(filters.agent_id);
            }
            if (filters.tool_name) {
                query += " AND tool_name = ?";
                params.push(filters.tool_name);
            }
            if (filters.start_time) {
                query += " AND timestamp >= ?";
                params.push(filters.start_time);
            }
            if (filters.end_time) {
                query += " AND timestamp <= ?";
                params.push(filters.end_time);
            }
            query += " ORDER BY timestamp DESC";
            if (filters.limit) {
                query += " LIMIT ?";
                params.push(filters.limit);
            }
            if (filters.offset) {
                query += " OFFSET ?";
                params.push(filters.offset);
            }
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    async getAggregatedData(filters) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            let whereClause = "WHERE 1=1";
            const params = [];
            if (filters.agent_id) {
                whereClause += " AND agent_id = ?";
                params.push(filters.agent_id);
            }
            if (filters.tool_name) {
                whereClause += " AND tool_name = ?";
                params.push(filters.tool_name);
            }
            if (filters.start_time) {
                whereClause += " AND timestamp >= ?";
                params.push(filters.start_time);
            }
            if (filters.end_time) {
                whereClause += " AND timestamp <= ?";
                params.push(filters.end_time);
            }
            const query = `
        SELECT 
          agent_id,
          tool_name,
          COUNT(*) as call_count,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost
        FROM token_usage
        ${whereClause}
        GROUP BY agent_id, tool_name
      `;
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const byAgent = {};
                const byTool = {};
                let totalCalls = 0;
                let totalTokens = 0;
                let totalCost = 0;
                rows.forEach((row) => {
                    // Aggregate by agent
                    if (!byAgent[row.agent_id]) {
                        byAgent[row.agent_id] = {
                            call_count: 0,
                            total_tokens: 0,
                            total_cost: 0,
                            avg_tokens_per_call: 0,
                        };
                    }
                    byAgent[row.agent_id].call_count += row.call_count;
                    byAgent[row.agent_id].total_tokens += row.total_tokens;
                    byAgent[row.agent_id].total_cost += row.total_cost;
                    // Aggregate by tool
                    if (!byTool[row.tool_name]) {
                        byTool[row.tool_name] = {
                            call_count: 0,
                            total_tokens: 0,
                            total_cost: 0,
                            avg_tokens_per_call: 0,
                        };
                    }
                    byTool[row.tool_name].call_count += row.call_count;
                    byTool[row.tool_name].total_tokens += row.total_tokens;
                    byTool[row.tool_name].total_cost += row.total_cost;
                    // Overall totals
                    totalCalls += row.call_count;
                    totalTokens += row.total_tokens;
                    totalCost += row.total_cost;
                });
                // Calculate averages
                Object.keys(byAgent).forEach(agent => {
                    byAgent[agent].avg_tokens_per_call = byAgent[agent].call_count > 0
                        ? byAgent[agent].total_tokens / byAgent[agent].call_count
                        : 0;
                });
                Object.keys(byTool).forEach(tool => {
                    byTool[tool].avg_tokens_per_call = byTool[tool].call_count > 0
                        ? byTool[tool].total_tokens / byTool[tool].call_count
                        : 0;
                });
                const summary = {
                    total_calls,
                    total_tokens,
                    total_cost,
                    avg_tokens_per_call: totalCalls > 0 ? totalTokens / totalCalls : 0,
                };
                resolve({ by_agent: byAgent, by_tool: byTool, summary });
            });
        });
    }
    async getSystemStats() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            const query = `
        SELECT 
          COUNT(*) as total_calls,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost,
          COUNT(DISTINCT agent_id) as active_agents,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
        FROM token_usage
      `;
            this.db.get(query, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    const totalCalls = row.total_calls || 0;
                    const errorRate = totalCalls > 0 ? (row.error_count || 0) / totalCalls : 0;
                    resolve({
                        total_calls: totalCalls,
                        total_tokens: row.total_tokens || 0,
                        total_cost: row.total_cost || 0,
                        active_agents: row.active_agents || 0,
                        error_rate: errorRate,
                    });
                }
            });
        });
    }
    async reset() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not initialized"));
                return;
            }
            this.db.run("DELETE FROM token_usage", (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=database.js.map