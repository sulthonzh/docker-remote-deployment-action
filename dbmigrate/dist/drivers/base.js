"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDriver = void 0;
class BaseDriver {
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
    getMigrationsTableName() {
        return 'schema_migrations';
    }
    async getMigrations() {
        try {
            const rows = await this.query(`SELECT version, name, applied_at FROM ${this.getMigrationsTableName()} ORDER BY version`);
            return rows.map((row) => ({
                timestamp: parseInt(row.version),
                name: row.name,
                version: row.version,
                appliedAt: new Date(row.applied_at),
            }));
        }
        catch (error) {
            if (this.isTableNotFoundError(error)) {
                await this.createTable();
                return [];
            }
            throw error;
        }
    }
    async markMigration(migration) {
        await this.execute(`INSERT INTO ${this.getMigrationsTableName()} (version, name) VALUES (?, ?)`, [migration.version, migration.name]);
    }
    async unmarkMigration(migration) {
        await this.execute(`DELETE FROM ${this.getMigrationsTableName()} WHERE version = ?`, [migration.version]);
    }
    isTableNotFoundError(error) {
        const errorMessages = [
            'no such table',
            'relation does not exist',
            'table not found',
            'table does not exist'
        ];
        return errorMessages.some(msg => error.message.toLowerCase().includes(msg));
    }
    formatTimestamp(timestamp) {
        return timestamp.toString().padStart(14, '0');
    }
}
exports.BaseDriver = BaseDriver;
//# sourceMappingURL=base.js.map