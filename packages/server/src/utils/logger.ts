import * as path from 'path'
import config from './config'
import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'

const { combine, timestamp, printf } = format

const logger = createLogger({
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json(),
        printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`
        })
    ),
    defaultMeta: {
        package: 'server'
    },
    transports: [
        new transports.Console(),
        new transports.File({
            filename: path.join(config.logDir, 'server-error.log'),
            level: 'error' // Log only errors to this file
        }),
        new transports.File({
            filename: path.join(config.logDir, 'server.log')
        })
    ],
    exceptionHandlers: [
        new transports.File({
            filename: path.join(config.logDir, 'server-exceptions.log')
        })
    ],
    rejectionHandlers: [
        new transports.File({
            filename: path.join(config.logDir, 'server-rejections.log')
        })
    ]
})

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const fileLogger = createLogger({
        format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json()),
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
            new transports.File({
                filename: path.join(config.logDir, 'server-requests.jsonl.log'),
                level: 'debug'
            }),
            new transports.File({
                filename: path.join(config.logDir, 'server-updates.jsonl.log')
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
        fileLogger.verbose(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
    }

    next()
}

export default logger
