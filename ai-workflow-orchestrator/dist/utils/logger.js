"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    level;
    context;
    constructor(level = 'info', context = 'WorkflowOrchestrator') {
        this.level = typeof level === 'string' ? this.parseLevel(level) : level;
        this.context = context;
    }
    parseLevel(level) {
        switch (level.toLowerCase()) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                return LogLevel.INFO;
        }
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const contextStr = this.context ? `[${this.context}]` : '';
        const formattedMessage = args.length > 0
            ? `${message} - ${JSON.stringify(args)}`
            : message;
        return `${timestamp} ${levelName} ${contextStr} - ${formattedMessage}`;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, ...args));
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.formatMessage(LogLevel.INFO, message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
        }
    }
    setLevel(level) {
        this.level = typeof level === 'string' ? this.parseLevel(level) : level;
    }
    setContext(context) {
        this.context = context;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map