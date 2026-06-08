"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDriver = void 0;
const base_1 = require("./base");
class SQLiteDriver extends base_1.BaseDriver {
    constructor(database) {
        super();
        this.dbPath = database;
    }
    async connect() {
        const sqlite3 = require('sqlite3');
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                throw new Error(`Failed to connect to SQLite database: ${err.message}`);
            }
        });
    }
    async disconnect() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(new Error(`Failed to close database: ${err.message}`));
                    }
                    else {
                        this.db = null;
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    async execute(sql, params) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return new Promise((resolve, reject) => {
            if (params && params.length > 0) {
                this.db.run(sql, params, (err) => {
                    if (err) {
                        reject(new Error(`SQL execution failed: ${err.message}`));
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                this.db.run(sql, (err) => {
                    if (err) {
                        reject(new Error(`SQL execution failed: ${err.message}`));
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    }
    async query(sql, params) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return new Promise((resolve, reject) => {
            if (params && params.length > 0) {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(new Error(`SQL query failed: ${err.message}`));
                    }
                    else {
                        resolve(rows);
                    }
                });
            }
            else {
                this.db.all(sql, (err, rows) => {
                    if (err) {
                        reject(new Error(`SQL query failed: ${err.message}`));
                    }
                    else {
                        resolve(rows);
                    }
                });
            }
        });
    }
    getMigrationsTableName() {
        return 'schema_migrations';
    }
}
exports.SQLiteDriver = SQLiteDriver;
//# sourceMappingURL=sqlite.js.map