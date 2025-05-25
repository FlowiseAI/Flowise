import * as path from 'path'
import * as fs from 'fs'
import { hostname } from 'node:os'
import config from './config' // should be replaced by node-config or similar
import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'
import DailyRotateFile from 'winston-daily-rotate-file'
import { S3ClientConfig } from '@aws-sdk/client-s3'
import { LoggingWinston } from '@google-cloud/logging-winston'

const { S3StreamLogger } = require('s3-streamlogger')

const { combine, timestamp, printf, errors } = format

let s3ServerStream: any
let s3ErrorStream: any
let s3ServerReqStream: any

let gcsServerStream: any
let gcsErrorStream: any
let gcsServerReqStream: any

if (process.env.STORAGE_TYPE === 's3') {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const s3Bucket = process.env.S3_STORAGE_BUCKET_NAME
    const customURL = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

    if (!region || !s3Bucket) {
        throw new Error('S3 storage configuration is missing')
    }

    const s3Config: S3ClientConfig = {
        region: region,
        endpoint: customURL,
        forcePathStyle: forcePathStyle
    }

    if (accessKeyId && secretAccessKey) {
        s3Config.credentials = {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        }
    }

    s3ServerStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/server',
        name_format: `server-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log`,
        config: s3Config
    })

    s3ErrorStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/error',
        name_format: `server-error-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log`,
        config: s3Config
    })

    s3ServerReqStream = new S3StreamLogger({
        bucket: s3Bucket,
        folder: 'logs/requests',
        name_format: `server-requests-%Y-%m-%d-%H-%M-%S-%L-${hostname()}.log.jsonl`,
        config: s3Config
    })
}

if (process.env.STORAGE_TYPE === 'gcs') {
    const config = {
        projectId: process.env.GOOGLE_CLOUD_STORAGE_PROJ_ID,
        keyFilename: process.env.GOOGLE_CLOUD_STORAGE_CREDENTIAL,
        defaultCallback: (err: any) => {
            if (err) {
                console.error('Error logging to GCS: ' + err)
            }
        }
    }
    gcsServerStream = new LoggingWinston({
        ...config,
        logName: 'server'
    })
    gcsErrorStream = new LoggingWinston({
        ...config,
        logName: 'error'
    })
    gcsServerReqStream = new LoggingWinston({
        ...config,
        logName: 'requests'
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
                  new DailyRotateFile({
                      filename: path.join(logDir, config.logging.server.filename ?? 'server-%DATE%.log'),
                      datePattern: 'YYYY-MM-DD-HH',
                      maxSize: '20m',
                      level: config.logging.server.level ?? 'info'
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ServerStream
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsServerStream] : [])
    ],
    exceptionHandlers: [
        ...(process.env.DEBUG && process.env.DEBUG === 'true' ? [new transports.Console()] : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ErrorStream
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsErrorStream] : [])
    ],
    rejectionHandlers: [
        ...(process.env.DEBUG && process.env.DEBUG === 'true' ? [new transports.Console()] : []),
        ...(process.env.STORAGE_TYPE === 's3'
            ? [
                  new transports.Stream({
                      stream: s3ErrorStream
                  })
              ]
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsErrorStream] : [])
    ]
})

export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
    const unwantedLogURLs = ['/api/v1/node-icon/', '/api/v1/components-credentials-icon/', '/api/v1/ping']

    if (/\/api\/v1\//i.test(req.url) && !unwantedLogURLs.some((url) => new RegExp(url, 'i').test(req.url))) {
        // Create a sanitized copy of the request body
        const sanitizedBody = { ...req.body }
        if (sanitizedBody.password) {
            sanitizedBody.password = '********'
        }

        const fileLogger = createLogger({
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json(), errors({ stack: true })),
            defaultMeta: {
                package: 'server',
                request: {
                    method: req.method,
                    url: req.url,
                    body: sanitizedBody, // Use sanitized body instead of raw body
                    query: req.query,
                    params: req.params,
                    headers: req.headers
                }
            },
            transports: [
                ...(process.env.DEBUG && process.env.DEBUG === 'true' ? [new transports.Console()] : []),
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
                    : []),
                ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsServerReqStream] : [])
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
