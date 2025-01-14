import * as path from 'path'
import * as fs from 'fs'
import { hostname } from 'node:os'
import config from './config' // should be replaced by node-config or similar
import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'

const { S3StreamLogger } = require('s3-streamlogger')

const { combine, timestamp, printf, errors } = format

let s3ServerStream: any
let s3ErrorStream: any
let s3ServerReqStream: any
if (process.env.STORAGE_TYPE === 's3') {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const s3Bucket = process.env.S3_STORAGE_BUCKET_NAME

    s3ServerStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/server',
        region,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        name_format: `server-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log`
    })

    s3ErrorStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/error',
        region,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        name_format: `server-error-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log`
    })

    s3ServerReqStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/requests',
        region,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        name_format: `server-requests-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log.jsonl`
    })
}

// expect the log dir be relative to the projects root
const logDir = config.logging.dir

// Create the log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir)
}

const logger = createLogger({
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json(),
        printf(({ level, message, timestamp, stack }) => {
            const text = `${timestamp} [${level.toUpperCase()}]: ${message}`
            return stack ? text + '\n' + stack : text
        }),
        errors({ stack: true })
    ),
    defaultMeta: {
        package: 'server'
    },
    transports: [
        new transports.Console(),
        ...(!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local'
            ? [
                  new transports.File({
                      filename: path.join(logDir, config.logging.server.filename ?? 'server.log'),
                      level: config.logging.server.level ?? 'info'
                  }),
                  new transports.File({
                      filename: path.join(logDir, config.logging.server.errorFilename ?? 'server-error.log'),
                      level: 'error' // Log only errors to this file
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ServerStream
                  })
              ]
            : [])
    ],
    exceptionHandlers: [
        ...(!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local'
            ? [
                  new transports.File({
                      filename: path.join(logDir, config.logging.server.errorFilename ?? 'server-error.log')
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ErrorStream
                  })
              ]
            : [])
    ],
    rejectionHandlers: [
        ...(!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local'
            ? [
                  new transports.File({
                      filename: path.join(logDir, config.logging.server.errorFilename ?? 'server-error.log')
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ErrorStream
                  })
              ]
            : [])
    ]
})

export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
    const unwantedLogURLs = ['/api/v1/node-icon/', '/api/v1/components-credentials-icon/']
    if (/\/api\/v1\//i.test(req.url) && !unwantedLogURLs.some((url) => new RegExp(url, 'i').test(req.url))) {
        const fileLogger = createLogger({
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json(), errors({ stack: true })),
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
                ...(!process.env.STORAGE_TYPE || process.env.STORAGE_TYPE === 'local'
                    ? [
                          new transports.File({
                              filename: path.join(logDir, config.logging.express.filename ?? 'server-requests.log.jsonl'),
                              level: config.logging.express.level ?? 'debug'
                          })
                      ]
                    : []),
                ...(process.env.STORAGE_TYPE === 's3'
                    ? [
                          new transports.Stream({
                              stream: s3ServerReqStream
                          })
                      ]
                    : [])
            ]
        })

        const getRequestEmoji = (method: string) => {
            const requetsEmojis: Record<string, string> = {
                GET: '⬇️',
                POST: '⬆️',
                PUT: '🖊',
                DELETE: '❌',
                OPTION: '🔗'
            }

            return requetsEmojis[method] || '?'
        }

        if (req.method !== 'GET') {
            fileLogger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
            logger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        } else {
            fileLogger.http(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        }
    }

    next()
}

export default logger
