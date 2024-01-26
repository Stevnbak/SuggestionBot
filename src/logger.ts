import winston from "winston";
import fs from "fs";

//Format
const format = winston.format.printf((info) => {
    return `[${info.timestamp}]-(${info.label}) ${info.level} > ${info.message}${info.stack ? "\n" + info.stack : ""}`;
});
//Levels
const winstonLevels = {
    levels: {
        critical: 0,
        error: 1,
        warning: 2,
        info: 3,
        database: 4
    },
    colors: {
        critical: "red",
        error: "red",
        warning: "yellow",
        info: "white",
        database: "blue"
    }
};
winston.addColors(winstonLevels.colors);
//Logger
export const logger = winston.createLogger({
    levels: winstonLevels.levels,
    format: winston.format.combine(
        winston.format.json(),
        winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss"
        }),
        winston.format.errors({ stack: true }),
        winston.format.label({ label: "Suggestion-Bot" })
    ),
    transports: [
        new winston.transports.Console({
            level: "database",
            format: winston.format.combine(
                winston.format((info) => {
                    info.level = info.level.toUpperCase();
                    return info;
                })(),
                winston.format.timestamp({
                    format: "DD-MM-YYYY HH:mm:ss"
                }),
                winston.format.label({ label: "Suggestion-Bot" }),
                winston.format.colorize({ all: true }),
                format
            )
        })
    ]
});

const splitFiles = false;
export function addFileLoggers() {
    //Save old files
    if (splitFiles && fs.existsSync("logs/combined.log")) {
        if (!fs.existsSync("logs/old")) fs.mkdirSync("logs/old");
        let date = new Date();
        let dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getUTCHours()}.${date.getUTCMinutes()}.${date.getUTCSeconds()}`;
        fs.renameSync("logs/combined.log", "logs/old/combined_" + dateString + ".log");
        fs.renameSync("logs/error.log", "logs/old/error_" + dateString + ".log");
    }
    //Add new transports
    logger.add(
        new winston.transports.File({
            level: "request",
            filename: "logs/combined.log",
            format: logger.format
        })
    );
    logger.add(
        new winston.transports.File({
            level: "error",
            filename: "logs/error.log",
            format: logger.format
        })
    );
}
