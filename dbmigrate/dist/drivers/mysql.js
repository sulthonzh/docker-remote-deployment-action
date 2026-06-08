"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLDriver = void 0;
const base_1 = require("./base");
class MySQLDriver extends base_1.BaseDriver {
    constructor(database) {
        super();
        this.connectionString = database;
    }
    async connect() {
        const mysql = require('mysql2/promise');
        this.db = await mysql.createConnection(this.connectionString);
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
            await this.db.execute(sql, params);
        }
        catch (error) {
            throw new Error(`MySQL execution failed: ${error.message}`);
        }
    }
    async query(sql, params) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        try {
            const [rows] = await this.db.execute(sql, params);
            return rows;
        }
        catch (error) {
            throw new Error(`MySQL query failed: ${error.message}`);
        }
    }
    async createTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS ${this.getMigrationsTableName()} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
        await this.execute(sql);
    }
}
exports.MySQLDriver = MySQLDriver;
//# sourceMappingURL=mysql.js.map