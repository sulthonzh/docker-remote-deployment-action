export class Logger {
    get isVerbose() {
        return process.env.VERBOSE === 'true';
    }
    get isCI() {
        return process.env.CI === 'true';
    }
    info(message) {
        if (this.isCI)
            return;
        console.log(`[INFO] ${message}`);
    }
    error(message) {
        console.error(`[ERROR] ${message}`);
    }
    warn(message) {
        console.warn(`[WARN] ${message}`);
    }
    debug(message) {
        if (this.isVerbose) {
            console.debug(`[DEBUG] ${message}`);
        }
    }
    success(message) {
        console.log(`[SUCCESS] ${message}`);
    }
}
//# sourceMappingURL=logger.js.map