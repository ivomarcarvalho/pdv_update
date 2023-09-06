const fs = require('fs');
const { createLogger, transports, format } = require('winston');
const logDirectory = process.env.LOG_DIRECTORY || './logs';

// Verifique se o diretório de log existe e crie-o, se necessário
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const errorLogger = createLogger({
    format: format.combine(
        format.errors({ stack: true }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `[${info.timestamp}] ${info.level} ${info.message} ${info.stack}`)
    ),
    transports: [
        new transports.File({
            maxFiles: 5,
            maxsize: 5120000,
            filename: `${logDirectory}/error.log`,
            level: 'error'
        })
    ],
});

const infoLogger = createLogger({
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `[${info.timestamp}] ${info.level} ${info.message}`)
    ),
    transports: [
        new transports.File({
            maxFiles: 5,
            maxsize: 5120000,
            filename: `${logDirectory}/info.log`,
            level: 'info'
        })
    ],
});

const warnLogger = createLogger({
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `[${info.timestamp}] ${info.level} ${info.message}`)
    ),
    transports: [
        new transports.File({
            maxFiles: 5,
            maxsize: 5120000,
            filename: `${logDirectory}/info.log`,
            level: 'warn'
        })
    ],
});

if (process.env.NODE_ENV !== 'production') {
    warnLogger.add(new transports.Console({
        format: format.combine(
            format.printf(info => `${info.level} ${info.message}`))
    }));
}

errorLogger.add(new transports.Console({
    format: format.combine(
        format.colorize(),
        format.printf(info => `${info.level} ${info.message}`))
}));

infoLogger.add(new transports.Console({
    format: format.combine(
        format.printf(info => `${info.message}`))
}));

module.exports = {
    errorLogger,
    infoLogger,
    warnLogger
};