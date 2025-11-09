export interface ILogger {
    log(level: number, levelName: string, ...args: unknown[]): void;
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    fatal(...args: unknown[]): void;
    panic(...args: unknown[]): void;

    getLogFileName(): string; // 获取日志文件名
    getLogFilePath(): string; // 获取日志文件路径
    getSubLogger(): ILogger; // 获取子日志记录器
    getNamedSubLogger(name: string): ILogger; // 获取命名子日志记录器
}
