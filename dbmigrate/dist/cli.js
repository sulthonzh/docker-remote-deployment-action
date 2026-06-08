#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const utils_1 = require("./utils");
const migrator_1 = require("./migrator");
const logger_1 = require("./logger");
const program = new commander_1.Command();
exports.program = program;
const logger = new logger_1.ConsoleLogger();
program
    .name('dbmigrate')
    .description('Zero-dependency CLI tool for database migrations')
    .version('1.0.0');
program
    .command('init')
    .description('Initialize a new migration project')
    .option('-d, --driver <driver>', 'Database driver (sqlite|postgresql|mysql)', 'sqlite')
    .option('--database <url>', 'Database connection string/file path')
    .option('--migrations-dir <dir>', 'Directory for migration files', './migrations')
    .option('--table <name>', 'Migration tracking table name', 'schema_migrations')
    .option('--no-transaction', 'Disable transactions')
    .action(async (options) => {
    try {
        const config = {
            driver: options.driver,
            database: options.database || getDatabaseUrl(options.driver),
            migrationsDir: options.migrationsDir,
            tableName: options.tableName || 'schema_migrations',
            transaction: options.transaction !== false,
        };
        (0, utils_1.writeConfig)(config);
        logger.log(`✓ Migration project initialized with driver: ${config.driver}`);
        logger.log(`✓ Database: ${config.database}`);
        logger.log(`✓ Migrations directory: ${config.migrationsDir}`);
        logger.log(`✓ Transactions: ${config.transaction ? 'enabled' : 'disabled'}`);
        logger.log('');
        logger.log('Create your first migration with:');
        logger.log('  dbmigrate create <description>');
    }
    catch (error) {
        logger.error(`Failed to initialize: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('create')
    .description('Create a new migration file')
    .argument('<description>', 'Migration description')
    .option('--dir <dir>', 'Migration directory')
    .option('--template <file>', 'Custom SQL template')
    .action(async (description, options) => {
    try {
        const config = (0, utils_1.readConfig)();
        if (options.dir) {
            config.migrationsDir = options.dir;
        }
        const filepath = (0, utils_1.createMigrationFile)(config, description);
        logger.log(`✓ Created migration: ${filepath}`);
        logger.log('');
        logger.log('Edit the migration file and run:');
        logger.log('  dbmigrate migrate');
    }
    catch (error) {
        logger.error(`Failed to create migration: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('migrate')
    .description('Run pending migrations')
    .option('--dry-run', 'Show what would be applied without executing')
    .option('-f, --force', 'Skip confirmation')
    .option('--verbose', 'Show detailed output')
    .action(async (options) => {
    try {
        const config = (0, utils_1.readConfig)();
        const migrator = new migrator_1.Migrator(config, logger);
        if (options.dryRun) {
            logger.log('=== DRY RUN ===');
            const result = await migrator.migrate(true, options.verbose);
            if (result.migrations.length === 0) {
                logger.log('No pending migrations');
            }
            else {
                logger.log('Pending migrations:');
                result.migrations.forEach(m => {
                    logger.log(`  - ${m}`);
                });
            }
            return;
        }
        const status = await migrator.getStatus();
        if (status.pending.length === 0) {
            logger.log('✓ No pending migrations');
            return;
        }
        logger.log('Pending migrations:');
        status.pending.forEach(m => {
            logger.log(`  - ${m.version}_${m.name}`);
        });
        if (!options.force && status.pending.length > 0) {
            const answer = await prompt('Apply these migrations? (y/N): ');
            if (answer.toLowerCase() !== 'y') {
                logger.log('Cancelled');
                return;
            }
        }
        const startTime = Date.now();
        const result = await migrator.migrate(false, options.verbose);
        if (result.success) {
            const duration = Date.now() - startTime;
            logger.log(`✓ Applied ${result.migrations.length} migrations in ${formatDuration(duration)}`);
        }
        else {
            logger.error('Migration failed');
            result.errors?.forEach(error => {
                logger.error(`  - ${error}`);
            });
            process.exit(1);
        }
    }
    catch (error) {
        logger.error(`Migration failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('rollback')
    .description('Rollback migrations')
    .option('--to <timestamp>', 'Rollback to specific migration')
    .option('-s, --steps <number>', 'Number of steps to rollback', '1')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
    try {
        const config = (0, utils_1.readConfig)();
        const migrator = new migrator_1.Migrator(config, logger);
        const steps = parseInt(options.steps);
        const status = await migrator.getStatus();
        if (status.applied.length === 0) {
            logger.log('✓ No migrations to rollback');
            return;
        }
        let migrationsToRollback;
        if (options.to) {
            const target = status.applied.find(m => m.version === options.to);
            if (!target) {
                logger.error(`Migration ${options.to} not found`);
                process.exit(1);
            }
            const targetIndex = status.applied.findIndex(m => m.version === options.to);
            migrationsToRollback = status.applied.slice(targetIndex);
        }
        else {
            migrationsToRollback = status.applied.slice(-steps);
        }
        logger.log('Migrations to rollback:');
        migrationsToRollback.forEach(m => {
            logger.log(`  - ${m.version}_${m.name}`);
        });
        if (!options.force && migrationsToRollback.length > 0) {
            const answer = await prompt('Rollback these migrations? (y/N): ');
            if (answer.toLowerCase() !== 'y') {
                logger.log('Cancelled');
                return;
            }
        }
        const startTime = Date.now();
        const result = await migrator.rollback(options.to, steps);
        if (result.success) {
            const duration = Date.now() - startTime;
            logger.log(`✓ Rolled back ${result.migrations.length} migrations in ${formatDuration(duration)}`);
        }
        else {
            logger.error('Rollback failed');
            result.errors?.forEach(error => {
                logger.error(`  - ${error}`);
            });
            process.exit(1);
        }
    }
    catch (error) {
        logger.error(`Rollback failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('status')
    .description('Show migration status')
    .option('--json', 'Output in JSON format')
    .option('--pending-only', 'Show only pending migrations')
    .action(async (options) => {
    try {
        const config = (0, utils_1.readConfig)();
        const migrator = new migrator_1.Migrator(config, logger);
        const { applied, pending } = await migrator.getStatus();
        if (options.json) {
            console.log(JSON.stringify({ applied, pending }, null, 2));
            return;
        }
        if (options.pendingOnly && pending.length === 0) {
            logger.log('No pending migrations');
            return;
        }
        if (!options.pendingOnly) {
            logger.log(`Applied migrations: ${applied.length}`);
            if (applied.length > 0) {
                logger.log('');
                applied.forEach((m) => {
                    logger.log(`  ✓ ${m.version}_${m.name} (${m.appliedAt.toLocaleDateString()})`);
                });
            }
        }
        if (pending.length > 0) {
            if (!options.pendingOnly) {
                logger.log('');
            }
            logger.log(`Pending migrations: ${pending.length}`);
            pending.forEach((m) => {
                logger.log(`  - ${m.version}_${m.name}`);
            });
        }
        if (pending.length === 0) {
            if (!options.pendingOnly) {
                logger.log('');
            }
            logger.log('✓ All migrations applied');
        }
    }
    catch (error) {
        logger.error(`Status check failed: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('next')
    .description('Show the next migration to apply')
    .action(async () => {
    try {
        const config = (0, utils_1.readConfig)();
        const migrator = new migrator_1.Migrator(config, logger);
        const next = await migrator.getNext();
        if (next) {
            logger.log(`${next.version}_${next.name}`);
        }
        else {
            logger.log('No pending migrations');
        }
    }
    catch (error) {
        logger.error(`Failed to get next migration: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('reset')
    .description('Reset migration tracking (dangerous!)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
    try {
        if (!options.force) {
            const answer = await prompt('This will reset all migration tracking. Are you sure? (y/N): ');
            if (answer.toLowerCase() !== 'y') {
                logger.log('Cancelled');
                return;
            }
        }
        const config = (0, utils_1.readConfig)();
        const migrator = new migrator_1.Migrator(config, logger);
        await migrator.reset();
        logger.log('✓ Migration tracking reset');
    }
    catch (error) {
        logger.error(`Reset failed: ${error.message}`);
        process.exit(1);
    }
});
// Helper functions
function getDatabaseUrl(driver) {
    switch (driver) {
        case 'sqlite':
            return './data.db';
        case 'postgresql':
            return 'postgres://user:password@localhost:5432/mydatabase';
        case 'mysql':
            return 'mysql://user:password@localhost:3306/mydatabase';
        default:
            return './data.db';
    }
}
async function prompt(question) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        readline.question(question, (answer) => {
            readline.close();
            resolve(answer.trim());
        });
    });
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
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection: ${reason}`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map