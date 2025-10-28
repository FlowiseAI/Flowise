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

let requestLogger: any

if (process.env.STORAGE_TYPE === 's3') {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const s3Bucket = process.env.S3_STORAGE_BUCKET_NAME
    const customURL = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

    if (!region || region.trim() === '' || !s3Bucket || s3Bucket.trim() === '') {
        throw new Error('S3 storage configuration is missing')
    }

    const s3Config: S3ClientConfig = {
        region: region,
        forcePathStyle: forcePathStyle
    }

    // Only include endpoint if customURL is not empty
    if (customURL && customURL.trim() !== '') {
        s3Config.endpoint = customURL
    }

    if (accessKeyId && accessKeyId.trim() !== '' && secretAccessKey && secretAccessKey.trim() !== '') {
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
    exitOnError: false,
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
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsErrorStream] : []),
        // Always provide a fallback rejection handler when no other handlers are configured
        ...((!process.env.DEBUG || process.env.DEBUG !== 'true') && process.env.STORAGE_TYPE !== 's3' && process.env.STORAGE_TYPE !== 'gcs'
            ? [new transports.Console()]
            : [])
    ]
})

requestLogger = createLogger({
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json(), errors({ stack: true })),
    defaultMeta: {
        package: 'server'
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

function getSensitiveBodyFields(): string[] {
    if (!process.env.LOG_SANITIZE_BODY_FIELDS) return []
    return (process.env.LOG_SANITIZE_BODY_FIELDS as string)
        .toLowerCase()
        .split(',')
        .map((f) => f.trim())
}

function getSensitiveHeaderFields(): string[] {
    if (!process.env.LOG_SANITIZE_HEADER_FIELDS) return []
    return (process.env.LOG_SANITIZE_HEADER_FIELDS as string)
        .toLowerCase()
        .split(',')
        .map((f) => f.trim())
}

function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    const sensitiveFields = getSensitiveBodyFields()
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }
    Object.keys(sanitized).forEach((key) => {
        const lowerKey = key.toLowerCase()
        if (sensitiveFields.includes(lowerKey)) {
            sanitized[key] = '********'
        } else if (typeof sanitized[key] === 'string') {
            if (sanitized[key].includes('@') && sanitized[key].includes('.')) {
                sanitized[key] = sanitized[key].replace(/([^@\s]+)@([^@\s]+)/g, '**********')
            }
        }
    })

    return sanitized
}

export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
    const unwantedLogURLs = ['/api/v1/node-icon/', '/api/v1/components-credentials-icon/', '/api/v1/ping']

    if (/\/api\/v1\//i.test(req.url) && !unwantedLogURLs.some((url) => new RegExp(url, 'i').test(req.url))) {
        const isDebugLevel = logger.level === 'debug' || process.env.DEBUG === 'true'

        const requestMetadata: any = {
            request: {
                method: req.method,
                url: req.url,
                params: req.params
            }
        }

        // Only include headers, body, and query if log level is debug
        if (isDebugLevel) {
            const sanitizedBody = sanitizeObject(req.body)
            const sanitizedQuery = sanitizeObject(req.query)
            const sanitizedHeaders = { ...req.headers }

            const sensitiveHeaders = getSensitiveHeaderFields()
            sensitiveHeaders.forEach((header) => {
                if (sanitizedHeaders[header]) {
                    sanitizedHeaders[header] = '********'
                }
            })

            requestMetadata.request.body = sanitizedBody
            requestMetadata.request.query = sanitizedQuery
            requestMetadata.request.headers = sanitizedHeaders
        }

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
            requestLogger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`, requestMetadata)
            logger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        } else {
            requestLogger.http(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`, requestMetadata)
        }
    }

    next()
}

export default logger
