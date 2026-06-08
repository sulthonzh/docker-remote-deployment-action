export interface Logger {
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}
export declare class ConsoleLogger implements Logger {
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}
export declare class SilentLogger implements Logger {
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}
//# sourceMappingURL=logger.d.ts.map