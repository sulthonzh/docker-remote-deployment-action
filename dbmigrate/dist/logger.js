"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = void 0;
class ConsoleLogger {
    log(message) {
        console.log(message);
    }
    error(message) {
        console.error(`Error: ${message}`);
    }
    warn(message) {
        console.warn(`Warning: ${message}`);
    }
    info(message) {
        console.info(`Info: ${message}`);
    }
}
exports.ConsoleLogger = ConsoleLogger;
class SilentLogger {
    log(message) {
        // Silent
    }
    error(message) {
        console.error(message);
    }
    warn(message) {
        console.warn(message);
    }
    info(message) {
        // Silent
    }
}
exports.SilentLogger = SilentLogger;
//# sourceMappingURL=logger.js.map