"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLDriver = void 0;
const base_1 = require("./base");
class PostgreSQLDriver extends base_1.BaseDriver {
    constructor(database) {
        super();
        this.connectionString = database;
    }
    async connect() {
        const { Pool } = require('pg');
        this.db = new Pool({
            connectionString: this.connectionString,
        });
    }
    async disconnect() {
        if (this.db) {
            await this.db.end();
            this.db = null;
        }
    }
    async execute(sql, params) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        try {
            await this.db.query(sql, params);
        }
        catch (error) {
            throw new Error(`PostgreSQL execution failed: ${error.message}`);
        }
    }
    async query(sql, params) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        try {
            const result = await this.db.query(sql, params);
            return result.rows;
        }
        catch (error) {
            throw new Error(`PostgreSQL query failed: ${error.message}`);
        }
    }
    async createTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS ${this.getMigrationsTableName()} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
        await this.execute(sql);
    }
}
exports.PostgreSQLDriver = PostgreSQLDriver;
//# sourceMappingURL=postgresql.js.map