"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migrator = void 0;
const sqlite_1 = require("./drivers/sqlite");
const postgresql_1 = require("./drivers/postgresql");
const mysql_1 = require("./drivers/mysql");
const utils_1 = require("./utils");
class Migrator {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || console;
        this.driver = this.createDriver();
    }
    createDriver() {
        switch (this.config.driver) {
            case 'sqlite':
                return new sqlite_1.SQLiteDriver(this.config.database);
            case 'postgresql':
                return new postgresql_1.PostgreSQLDriver(this.config.database);
            case 'mysql':
                return new mysql_1.MySQLDriver(this.config.database);
            default:
                throw new Error(`Unsupported driver: ${this.config.driver}`);
        }
    }
    async connect() {
        await this.driver.connect();
        await this.driver.createTable();
    }
    async disconnect() {
        await this.driver.disconnect();
    }
    async getStatus() {
        await this.connect();
        const migrations = (0, utils_1.loadMigrations)(this.config);
        const appliedStatus = await this.driver.getMigrations();
        const appliedVersions = appliedStatus.map(m => m.version);
        const pending = migrations.filter(m => !appliedVersions.includes(m.version));
        await this.disconnect();
        return { applied: appliedStatus.map((m) => ({
                timestamp: m.timestamp,
                name: m.name,
                version: m.version,
                path: '',
                up: ''
            })), pending };
    }
    async getPending() {
        const { pending } = await this.getStatus();
        return pending;
    }
    async getNext() {
        const pending = await this.getPending();
        return pending.length > 0 ? pending[0] : null;
    }
    async migrate(dryRun = false, verbose = false) {
        await this.connect();
        const migrations = (0, utils_1.loadMigrations)(this.config);
        const appliedStatus = await this.driver.getMigrations();
        const appliedVersions = appliedStatus.map(m => m.version);
        const pending = migrations.filter(m => !appliedVersions.includes(m.version));
        if (pending.length === 0) {
            await this.disconnect();
            return {
                success: true,
                migrations: [],
            };
        }
        if (dryRun) {
            await this.disconnect();
            return {
                success: true,
                migrations: pending.map(m => `${m.version}_${m.name}`),
            };
        }
        const appliedMigrations = [];
        let hasErrors = false;
        const errors = [];
        try {
            for (const migration of pending) {
                try {
                    if (verbose) {
                        this.logger.info(`Applying migration: ${migration.version}_${migration.name}`);
                    }
                    if (this.config.transaction) {
                        // Start transaction
                        await this.driver.execute('BEGIN TRANSACTION');
                        try {
                            await this.driver.execute(migration.up);
                            await this.driver.markMigration(migration);
                            await this.driver.execute('COMMIT');
                            if (verbose) {
                                this.logger.info(`✓ Applied: ${migration.version}_${migration.name}`);
                            }
                            appliedMigrations.push(`${migration.version}_${migration.name}`);
                        }
                        catch (error) {
                            await this.driver.execute('ROLLBACK');
                            throw error;
                        }
                    }
                    else {
                        // No transaction
                        await this.driver.execute(migration.up);
                        await this.driver.markMigration(migration);
                        if (verbose) {
                            this.logger.info(`✓ Applied: ${migration.version}_${migration.name}`);
                        }
                        appliedMigrations.push(`${migration.version}_${migration.name}`);
                    }
                }
                catch (error) {
                    hasErrors = true;
                    const errorMessage = `Failed to apply migration ${migration.version}_${migration.name}: ${error.message}`;
                    errors.push(errorMessage);
                    this.logger.error(errorMessage);
                    // Stop on error if not in transaction mode
                    if (!this.config.transaction) {
                        break;
                    }
                }
            }
            await this.disconnect();
            return {
                success: !hasErrors,
                migrations: appliedMigrations,
                errors: hasErrors ? errors : undefined,
            };
        }
        catch (error) {
            await this.disconnect();
            throw error;
        }
    }
    async rollback(to, steps = 1) {
        await this.connect();
        const appliedStatus = await this.driver.getMigrations();
        let migrationsToRollback = [];
        if (to) {
            // Rollback to specific version
            const targetIndex = appliedStatus.findIndex(m => m.version === to);
            if (targetIndex === -1) {
                throw new Error(`Migration ${to} not found in applied migrations`);
            }
            migrationsToRollback = appliedStatus.slice(targetIndex);
        }
        else {
            // Rollback last N steps
            migrationsToRollback = appliedStatus.slice(-steps);
        }
        const rolledBackMigrations = [];
        let hasErrors = false;
        const errors = [];
        try {
            for (const migration of migrationsToRollback.reverse()) {
                try {
                    const migrationFile = (0, utils_1.loadMigrations)(this.config).find(m => m.version === migration.version);
                    if (!migrationFile || !migrationFile.down) {
                        throw new Error(`No down migration found for ${migration.version}_${migration.name}`);
                    }
                    if (this.config.transaction) {
                        // Start transaction
                        await this.driver.execute('BEGIN TRANSACTION');
                        try {
                            await this.driver.execute(migrationFile.down);
                            await this.driver.unmarkMigration(migration);
                            await this.driver.execute('COMMIT');
                            this.logger.info(`✓ Rolled back: ${migration.version}_${migration.name}`);
                            rolledBackMigrations.push(`${migration.version}_${migration.name}`);
                        }
                        catch (error) {
                            await this.driver.execute('ROLLBACK');
                            throw error;
                        }
                    }
                    else {
                        // No transaction
                        await this.driver.execute(migrationFile.down);
                        await this.driver.unmarkMigration(migration);
                        this.logger.info(`✓ Rolled back: ${migration.version}_${migration.name}`);
                        rolledBackMigrations.push(`${migration.version}_${migration.name}`);
                    }
                }
                catch (error) {
                    hasErrors = true;
                    const errorMessage = `Failed to rollback migration ${migration.version}_${migration.name}: ${error.message}`;
                    errors.push(errorMessage);
                    this.logger.error(errorMessage);
                    // Stop on error if not in transaction mode
                    if (!this.config.transaction) {
                        break;
                    }
                }
            }
            await this.disconnect();
            return {
                success: !hasErrors,
                migrations: rolledBackMigrations.reverse(),
                errors: hasErrors ? errors : undefined,
            };
        }
        catch (error) {
            await this.disconnect();
            throw error;
        }
    }
    async reset() {
        await this.connect();
        try {
            await this.driver.execute(`DELETE FROM ${this.config.tableName}`);
            this.logger.info('All migrations reset');
        }
        finally {
            await this.disconnect();
        }
    }
}
exports.Migrator = Migrator;
//# sourceMappingURL=migrator.js.map