export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export declare class Logger {
    private level;
    private context;
    constructor(level?: string | LogLevel, context?: string);
    private parseLevel;
    private formatMessage;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLevel(level: string | LogLevel): void;
    setContext(context: string): void;
}
//# sourceMappingURL=logger.d.ts.map