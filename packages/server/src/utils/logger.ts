import * as path from 'path'
import * as fs from 'fs'
import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { createLogger, transports, format } from 'winston'
import { config as winstonConfig } from 'winston'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const { combine, timestamp, printf, errors, json, colorize } = format
const LOG_LEVELS = winstonConfig.npm.levels
const timestampFormat = 'YYYY-MM-DD HH:mm:ss'
const logDir = process.env.LOG_PATH ?? path.join(__dirname, '..', '..', '..', '..', 'logs')
const logLevel = process.env.LOG_LEVEL ?? 'info'

// Create the log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir)
}

function printMessage(
    options: { metadata?: boolean; pretty?: boolean; timestamp?: boolean } = { metadata: false, pretty: false, timestamp: true }
) {
    return printf(({ level, message, stack, timestamp, ...metadata }) => {
        let text = `${options.timestamp ? timestamp + ' ' : ''}[${level}]: ${message}`

        // Filter out metadata starting with _ unless debugLevel is DEBUG
        const filteredMetadata =
            LOG_LEVELS[logLevel] >= LOG_LEVELS['debug']
                ? metadata
                : Object.entries(metadata).reduce((acc, [key, value]) => (key.startsWith('_') ? acc : { ...acc, [key]: value }), {})

        // Add metadata if present and metadata is true
        if (options.metadata && Object.keys(filteredMetadata).length !== 0) {
            text += `: ${JSON.stringify(filteredMetadata, null, options.pretty ? 2 : undefined)}`
        }
        return stack ? text + '\n' + stack : text
    })
}

// Custom filter function to match specific metadata field
const filterPredictions = format((info) => {
    if (info.message && info.message.includes('[server/prediction]')) {
        return info
    }
    return false
})

const logger = createLogger({
    level: logLevel,
    format: combine(
        timestamp({ format: timestampFormat }),
        errors({ stack: LOG_LEVELS[logLevel] >= LOG_LEVELS['debug'] }),
        printMessage({ metadata: true, pretty: false, timestamp: false })
    ),
    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                errors({ stack: LOG_LEVELS[logLevel] >= LOG_LEVELS['debug'] }),
                printMessage({ metadata: true, pretty: true, timestamp: false })
            )
        }),
        new transports.File({
            format: combine(printMessage({ metadata: true, pretty: false, timestamp: true })),
            filename: path.join(logDir, 'server.log')
        }),
        new transports.File({
            format: combine(errors({ stack: true }), printMessage({ metadata: true, pretty: false, timestamp: true })),
            filename: path.join(logDir, 'server-error.log'),
            level: 'error' // Log only errors to this file
        }),
        new transports.File({
            filename: path.join(logDir, 'server.log.jsonl'),
            format: combine(timestamp({ format: timestampFormat }), json())
        }),
        new transports.File({
            filename: path.join(logDir, 'predictions.log'),
            format: combine(
                timestamp({ format: timestampFormat }),
                printMessage({ metadata: true, pretty: true, timestamp: true }),
                filterPredictions()
            ) // only if message contains [server/prediction]
        }),
        new transports.File({
            filename: path.join(logDir, 'predictions.log.jsonl'),
            format: combine(timestamp({ format: timestampFormat }), json(), filterPredictions()) // only if message contains [server/prediction]
        })
    ],
    exceptionHandlers: [
        new transports.Console(),
        new transports.File({
            filename: path.join(logDir, 'server-error.log')
        })
    ],
    rejectionHandlers: [
        new transports.Console(),
        new transports.File({
            filename: path.join(logDir, 'server-error.log')
        })
    ]
})

logger.info(`logger configured with level: ${logLevel} using ${logDir}`)

/**
 * This function is used by express as a middleware.
 * @example
 *   this.app = express()
 *   this.app.use(expressRequestLogger)
 */
export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
    const fileLogger = createLogger({
        level: logLevel,
        defaultMeta: {
            package: 'server',
            request: {
                method: req.method,
                url: req.url,
                body: req.body,
                query: req.query,
                params: req.params,
                headers: req.headers
            }
        },
        transports: [
            new transports.Console({
                format: combine(
                    colorize(),
                    printf(({ level, message }) => `[${level}]: ${message}`)
                )
            }),
            new transports.File({
                filename: path.join(logDir, 'server-requests.log.jsonl'),
                format: combine(timestamp({ format: timestampFormat }), json(), errors({ stack: true }))
            })
        ]
    })

    const getRequestEmoji = (method: string) => {
        const requetsEmojis: Record<string, string> = {
            GET: '⬇️',
            POST: '⬆️',
            PUT: '🖊',
            DELETE: '❌'
        }

        return requetsEmojis[method] || '?'
    }

    if (req.method !== 'GET') {
        fileLogger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        logger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
    } else {
        fileLogger.http(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
    }

    next()
}

export default logger
