import { Logger } from "./logger/tslog-logger";

async function main() {
    var logger = new Logger({
        fileLog: true,
        maxLogFileSizeKB: 5
    });

    logger.trace("This is a trace message");
    logger.debug("This is a debug message");
    logger.info("This is an info message");
    logger.warn("This is a warning message");
    logger.error("This is an error message");
    logger.fatal("This is a fatal message");
}

// 运行主函数
main();
