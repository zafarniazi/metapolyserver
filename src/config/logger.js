const os = require("os");
const winston = require("winston");
const DailyRotateFile = require('winston-daily-rotate-file');
const Sentry = require("winston-sentry-log");
const APIError = require("../api/utils/APIError");

const { printf } = winston.format;

class Logger {
    constructor(name, options = {}) {
        this.name = name;
        this.hostname = os.hostname();

        this.logger = winston.createLogger({
            level: options.logLevel,
            defaultMeta: { service: name },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.metadata({
                            fillExcept: ["timestamp", "service", "level", "message"]
                        }),
                        winston.format.colorize(),
                        this.winstonConsoleFormat()
                    )
                }),
                new winston.transports.File({
                    filename: "error.log",
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.errors({ stack: true }),
                        winston.format.metadata(),
                        winston.format.json()
                    )
                }),
                new winston.transports.File({ filename: 'combined.log' }),
                new DailyRotateFile({
                    filename: 'application-%DATE%.log',
                    datePattern: 'YYYY-MM-DD-HH',
                    dirname: 'logs',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '60d'
                })
            ]
        });

        if (process.env.NODE_ENV === 'production') {
            this.logger.transports.push(new Sentry({
                config: {
                    dsn: 'https://93a02082e98449f08ef56b6a0b271f48@o422315.ingest.sentry.io/5347641',
                    level: 'warn'
                }
            }))
        }

        if (options.sensitiveFields) {
            this.sensitiveFields = options.sensitiveFields;
            this.checkSensitiveFields = true;
        }
    }

    winstonConsoleFormat() {
        return printf(({ timestamp, level, message, metadata }) => {
            const metadataString = metadata != null ? JSON.stringify(metadata) : "";
            return `[${timestamp}][${level}] ${message}. ${"METADATA: " + metadataString}`;
        });
    }

    debug(log, metadata) {
        this.log("debug", log, metadata);
    }

    info(log, ...metadata) {
        this.log("info", log, metadata);
    }

    warn(log, metadata) {
        this.log("warn", log, metadata);
    }

    error(log, metadata) {
        this.log("error", log, metadata);
    }

    log(level, log, metadata, stackTrace) {
        const metadataObject = {};

        if (metadata) metadataObject.metadata = metadata;
        if (stackTrace) metadataObject.stackTrace = stackTrace;

        if (this.checkSensitiveFields) {
            const sensitiveFieldFound = Object.keys(
                metadataObject.metadata || {}
            ).find(key => this.sensitiveFields.includes(key));
            if (sensitiveFieldFound)
                return this.logTrace(
                    "warn",
                    `You tried to log the following sensitive key: "${sensitiveFieldFound}". Please check attached stack trace.`
                );
        }

        if (log instanceof Error || log instanceof APIError) {
            return this.logger[level](log.message, {
                metadata: { stack: log.stack }
            });
        }

        this.logger[level](log, metadataObject);
    }

    logTrace(level, log, metadata) {
        const stackTrace = new Error().stack;
        this.log(level, log, metadata, stackTrace);
    }
}

module.exports = new Logger('MetaPoly', {
    logLevel: 'info'
});

// We will also expose a function if we want
// to use the logger with custom parameters
module.exports.getLogger = (name, options) => {
    return new Logger(name, options);
};