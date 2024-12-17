import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LEVELS = {
    critical: { level: 0, color: "bold red blackBG" },
    error: { level: 1, color: "red" },
    warn: { level: 2, color: "yellow" },
    info: { level: 3, color: "bold green" },
    debug: { level: 4, color: "blue" },
    trace: { level: 5, color: "cyan" },
    unit: { level: 6, color: "bold cyan" }
}

// Função para mapear a cor do LEVELS.color para códigos ANSI
function getAnsiColor(colorString) {
    const colorMap = {
        bold: "\x1b[1m",
        blackBG: "\x1b[40m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m",
        reset: "\x1b[0m"
    }

    // Divide as cores (e.g., "bold red blackBG") e converte cada uma
    return colorString
        .split(" ")
        .map(color => colorMap[color] || "")
        .join("");
}

const shutup = new winston.transports.Console({
    level: 'silent',
    silent: true
})

class EasyConsole {
    constructor() {
        this.name = "EasyConsole";
        this.padding = 8;
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    gen(name) {
        return new winston.transports.Console({
            format: winston.format.combine(
                winston.format.label({ label: name }),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS', tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
                winston.format.printf(info => {
                    const { timestamp, level, message, label } = info;
                    const color = getAnsiColor(LEVELS[level]?.color || "");
                    const paddedLevel = level.padEnd(8, ' ').toUpperCase();
                    const reset = "\x1b[0m";

                    return `[${timestamp}] [${color}${paddedLevel}${reset}] ${color}${label}: ${message}${reset}`;
                }),
            )
        })
    }
}

class EasyFileRotate {
    constructor(options) {
        this.name = "EasyFileRotate";
        this.padding = 8;
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.filename = options.filename;
        this.maxSize = options.maxSize;
        this.maxFiles = options.maxFiles;
    }

    gen(name) {
        return new DailyRotateFile({
            filename: this.filename,
            datePattern: 'YYYYMMDD',
            zippedArchive: true,
            maxSize: this.maxSize,
            maxFiles: this.maxFiles,
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.label({ label: name }),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS', tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
                winston.format.printf(({ level, message, label, timestamp }) => {
                    const paddedLevel = level.padEnd(this.padding, ' ').toUpperCase();
                    return `[${timestamp}] [${paddedLevel}] ${label}: ${message}`;
                }),
            ),
        });
    }
}

class Logger {
    constructor(builder, name) {
        this.builder = builder;
        this.name = name;
        this.children = undefined;
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        this.padding = 8

        this.winston = winston.createLogger({
            levels: builder._getLevels(),
            level: 'debug',
            transports: [ shutup ],
        })

        // this allow us to do "logger.<info/debug/etc>('message')" and actually sends it to winston
        // function Logger.[LEVEL](message)
        for (const level in LEVELS) {
            this[level] = (m) => {
                // update childrens before logging // probably not efficient here... only do it at transport?
                this.winston[level](m);
            }
        }
    }


    // ----------------------------------------------------------------------------------------------------
    // Propagators 

    // Propagate the transport to child logs (every log that is prefixed with "${this.name}." of our log)
    _propagateTransport(Transport) {
        this.children = this.builder.loggers.filter(logger => logger.name.startsWith(this.name + "."));
        for (const child of this.children) {
            child.addTransport(Transport); // add transport to it
        }
    }

    // Propagate the level to child logs
    _propagateLevel(level) {
        this.children = this.builder.loggers.filter(logger => logger.name.startsWith(this.name + "."));
        for (const child of this.children) {
            child.setLevel(level); // set level to it
        }
    }

    // ----------------------------------------------------------------------------------------------------
    // Methods 

    setLevel(level) {
        this.winston.level = level;
        this._propagateLevel(level); // propagate level to child logs
    }

    addTransport(Transport) {

        // @NOTE(adrian): THIS line right here is what make us incompatible with winston formatters
        // and why we need custom transport "wrappers": we need to tell the formatter the name of the label
        // i dont know how to do this any other way. deal with it
        this.winston.add(Transport.gen(this.name)); // update our log
        this._propagateTransport(Transport); // propagate transport to child logs 
    }

}

class LogBuilder {
    constructor() {
        this.levels = {
            critical: { level: 0, color: "bold red blackBG" },
            error: { level: 1, color: "red" },
            warn: { level: 2, color: "yellow" },
            info: { level: 3, color: "bold green" },
            debug: { level: 4, color: "blue" },
            trace: { level: 5, color: "cyan" },
            unit: { level: 6, color: "bold cyan" }
        }

        // Active loggers
        this.loggers = [];

        // List quick transports
        this.transports = {
            Console: EasyConsole,
            FileRotate: EasyFileRotate
        }

        // Adding this.[LEVEL] consts to the class
        for (let level in LEVELS) {
            this[level.toUpperCase()] = LEVELS[level].level;
        }    
    }

    // -------------------------------------------------

    _getLevels() {
        const levels = {};
        for (const key in LEVELS) {
            levels[key] = LEVELS[key].level;
        }
        return levels;
    }

    _getColors() {
        const colors = {};
        for (const key in LEVELS) {
            colors[key] = LEVELS[key].color;
        }
        return colors;

    }

    // -------------------------------------------------

    getLogger(name) {

        // get logger if it exists
        let logger = this.loggers.find(logger => logger.name === name);
        if (logger) {
            return logger;
        }

        // logger does not exist, register a new one and return it
        logger = new Logger(this, name);
        this.loggers.push(logger);
        return logger;

    }
}

export const logging = new LogBuilder()