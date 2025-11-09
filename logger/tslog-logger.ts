import { Logger as TsLogger, type ILogObj } from "tslog";
import type { ILogger } from "./logger";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    unlinkSync
} from "node:fs";
import path from "node:path";
import { appendFile } from "node:fs/promises";

interface LoggerOptions {
    name?: string;
    minLevel?: number;

    consoleLog?: boolean;
    fileLog?: boolean;
    pretty?: boolean;

    displayPath?: boolean;

    logDirectory?: string;
    logFilePrefix?: string;
    maxLogFileSizeKB?: number;
    maxLogFileCount?: number;
    maxLogDurationMinutes?: number;
}

const customLogLevelNames: Record<number, string> = {
    0: "SILLY",
    1: "TRACE",
    2: "DEBUG",
    3: "INFO_",
    4: "WARN_",
    5: "ERROR",
    6: "FATAL"
};

export class Logger implements ILogger {
    private logger!: TsLogger<ILogObj>;
    private options!: LoggerOptions;

    useFileLogging: boolean = false; // 是否使用文件日志记录

    LOG_DIRECTORY: string = "logs"; // 日志存储目录
    LOG_FILE_PREFIX: string = "log"; // 日志文件名前缀
    MAX_LOG_FILE_SIZE_KB: number = 5 * 1024; // 单个日志文件最大大小（KB）
    MAX_LOG_FILE_COUNT: number = 10; // 最多保留的日志文件数量
    MAX_LOG_DURATION_MINUTES: number = 60 * 24; // 单个日志文件的最长使用时间（分钟，默认1天）

    currentFileCreatedAt!: Date; // 创建当前日志文件的时间，这个属性在 newLogFile 方法中初始化
    currentLogFilePath: string = this.newLogFile(); // 当前日志文件路径

    constructor(options?: LoggerOptions) {
        this.options = options ?? {};

        // 应用配置选项
        this.LOG_DIRECTORY = options?.logDirectory ?? this.LOG_DIRECTORY;
        this.LOG_FILE_PREFIX = options?.logFilePrefix ?? this.LOG_FILE_PREFIX;
        this.MAX_LOG_FILE_SIZE_KB =
            options?.maxLogFileSizeKB ?? this.MAX_LOG_FILE_SIZE_KB;
        this.MAX_LOG_FILE_COUNT =
            options?.maxLogFileCount ?? this.MAX_LOG_FILE_COUNT;
        this.MAX_LOG_DURATION_MINUTES =
            options?.maxLogDurationMinutes ?? this.MAX_LOG_DURATION_MINUTES;

        // 控制台输出配置

        var logType: "hidden" | "pretty" | "json" = "hidden";
        if (options?.consoleLog ?? true) {
            logType = (options?.pretty ?? true) ? "pretty" : "json";
        }

        this.logger = new TsLogger<ILogObj>({
            name: options?.name ?? "app",
            minLevel: options?.minLevel ?? 3,
            type: logType,
            prettyLogTemplate: `{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}} [{{logLevelName}}]${options?.displayPath ? " [{{filePathWithLine}}]" : ""} [{{name}}] `,
            overwrite: {
                addPlaceholders: (logObjMeta, placeholderValues) => {
                    const originalLevel = logObjMeta.logLevelId;
                    placeholderValues["logLevelName"] =
                        customLogLevelNames[originalLevel] || "UNKNOWN";
                }
            },
            prettyLogStyles: {
                logLevelName: {
                    "*": ["bold", "black", "bgWhiteBright", "dim"],
                    SILLY: ["bold", "white"],
                    TRACE: ["bold", "whiteBright"],
                    DEBUG: ["bold", "green"],
                    INFO_: ["bold", "blue"],
                    WARN_: ["bold", "yellow"],
                    ERROR: ["bold", "red"],
                    FATAL: ["bold", "redBright"]
                },
                name: {
                    "*": ["bold", "dim"],
                    app: ["bold", "green"]
                }
            }
        });

        // 文件输出
        if (options?.fileLog ?? false) {
            this.useFileLogging = true;
            this.initLogDirectory();
            this.logger.attachTransport((logObj) => {
                this.writeFile(JSON.stringify(logObj)); // 结构化
            });
        }
    }

    log(level: number, levelName: string, ...args: unknown[]): void {
        this.logger.log(level, levelName, ...args);
    }

    trace(...args: unknown[]): void {
        this.logger.trace(...args);
    }

    debug(...args: unknown[]): void {
        this.logger.debug(...args);
    }

    info(...args: unknown[]): void {
        this.logger.info(...args);
    }

    warn(...args: unknown[]): void {
        this.logger.warn(...args);
    }

    error(...args: unknown[]): void {
        this.logger.error(...args);
    }

    fatal(...args: unknown[]): void {
        this.logger.fatal(...args);
    }

    panic(...args: unknown[]): void {
        this.logger.fatal(...args);
        // 手动叫出 panic
        throw new Error("Panic: " + args.join(" "));
    }

    getLogFileName(): string {
        return path.basename(this.currentLogFilePath);
    }

    getLogFilePath(): string {
        return this.currentLogFilePath;
    }

    getSubLogger(): ILogger {
        return this.getNamedSubLogger(this.options.name ?? "app");
    }

    getNamedSubLogger(name: string): ILogger {
        // 继承主要配置，只变 name
        const options: LoggerOptions = {
            ...this.logger.settings,
            name: name,
            fileLog: this.useFileLogging,
            consoleLog: true,
            pretty: this.logger.settings.type === "pretty",
            displayPath: Boolean(
                this.logger.settings.prettyLogTemplate?.includes(
                    "filePathWithLine"
                )
            )
        };

        // 创建子 logger
        const subLogger = new Logger(options);

        // 复用主 logger 的文件写入
        if (this.useFileLogging) {
            subLogger.logger.attachTransport((logObj) => {
                this.writeFile(JSON.stringify(logObj));
            });
        }
        return subLogger;
    }

    initLogDirectory(): void {
        if (this.useFileLogging) {
            // 如果本地的日志目录不存在，则创建它
            if (!existsSync(this.LOG_DIRECTORY)) {
                mkdirSync(this.LOG_DIRECTORY);
            }
        }
    }

    newLogFile(): string {
        const now = new Date();

        const timeKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}-${now.getSeconds().toString().padStart(2, "0")}`;
        const filename = `${this.LOG_FILE_PREFIX}_${timeKey}.jsonl`;
        this.currentFileCreatedAt = now;

        if (this.currentLogFilePath) {
            this.cleanupOldLogFiles(); // 清理旧日志文件
        }

        return path.join(this.LOG_DIRECTORY, filename); // 返回日志文件的完整路径
    }

    async writeFile(logMsg: string) {
        let needRotate = false;
        const now = new Date();

        // 检查文件状态
        if (existsSync(this.currentLogFilePath)) {
            // 是否超过这个日志文件的大小限制
            const stat = statSync(this.currentLogFilePath); // 获取文件状态
            if (
                stat.size + Buffer.byteLength(logMsg, "utf8") >
                this.MAX_LOG_FILE_SIZE_KB * 1024
            ) {
                needRotate = true;
            }

            // 是否超过这个日志文件的时间限制
            const durationMinutes =
                (now.getTime() - this.currentFileCreatedAt.getTime()) /
                (1000 * 60);
            if (durationMinutes > this.MAX_LOG_DURATION_MINUTES) {
                needRotate = true;
            }

            if (needRotate) {
                this.currentLogFilePath = this.newLogFile();
            }

            // 写入日志
            await appendFile(this.currentLogFilePath, logMsg + "\n");
        } else {
            // 文件不存在，创建新文件并写入日志
            this.currentLogFilePath = this.newLogFile();
            await appendFile(this.currentLogFilePath, logMsg + "\n");
        }
    }

    private cleanupOldLogFiles() {
        // 获取所有日志文件
        const logFiles = readdirSync(this.LOG_DIRECTORY)
            .filter(
                (file) =>
                    file.startsWith(this.LOG_FILE_PREFIX) &&
                    file.endsWith(".jsonl")
            )
            .map((file) => {
                const fullPath = path.join(this.LOG_DIRECTORY, file);
                let mtime = 0;
                try {
                    mtime = statSync(fullPath).mtime.getTime();
                } catch (e) {
                    // 文件可能在并发轮转时被删掉，安全忽略
                }
                return { file, fullPath, mtime };
            })
            .filter((f) => f.mtime > 0);

        // 按修改时间升序排列
        logFiles.sort((a, b) => a.mtime - b.mtime);

        // 保留最新的 N 个，删除最老的
        if (logFiles.length > this.MAX_LOG_FILE_COUNT) {
            const filesToDelete = logFiles.slice(
                0,
                logFiles.length - this.MAX_LOG_FILE_COUNT
            );
            for (const { file, fullPath } of filesToDelete) {
                try {
                    unlinkSync(fullPath);
                } catch (e) {
                    this.logger.error(
                        `Failed to delete old log file: ${file}`,
                        e
                    );
                }
            }
        }
    }
}
