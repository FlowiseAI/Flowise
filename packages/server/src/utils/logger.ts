import * as path from 'path'
import * as fs from 'fs'
import { hostname } from 'node:os'
import config from './config' // should be replaced by node-config or similar
import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'
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
    const region = process.env.S3_STORAGE_REGION || 'us-east-1'
    const s3Bucket = process.env.S3_STORAGE_BUCKET_NAME
    const customURL = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

    if (!s3Bucket) {
        // Enhanced error message with troubleshooting information
        const errorMsg = [
            '❌ S3 STORAGE CONFIGURATION ERROR',
            '',
            'STORAGE_TYPE is set to "s3" but S3_STORAGE_BUCKET_NAME is not defined.',
            '',
            'REQUIRED VARIABLES FOR S3 STORAGE:',
            '  S3_STORAGE_BUCKET_NAME - The name of your S3 bucket (REQUIRED)',
            '  S3_STORAGE_REGION - AWS region (optional, defaults to us-east-1)',
            '  S3_STORAGE_ACCESS_KEY_ID - AWS access key (optional, uses IAM role if not set)',
            '  S3_STORAGE_SECRET_ACCESS_KEY - AWS secret key (optional, uses IAM role if not set)',
            '',
            'TO FIX THIS ISSUE:',
            '1. If using Copilot/CloudFormation:',
            '   - Check that S3_STORAGE_BUCKET_NAME is set from CloudFormation outputs',
            '   - Verify the CloudFormation export name matches your manifest.yml',
            '',
            '2. If using .env file:',
            '   - Add S3_STORAGE_BUCKET_NAME=your-actual-bucket-name',
            '   - Ensure STORAGE_TYPE=s3 is set',
            '',
            '3. If not using S3 storage:',
            '   - Change STORAGE_TYPE to "local" or remove it entirely',
            '   - Remove any S3_* environment variables',
            '',
            'CURRENT CONFIGURATION:',
            `  STORAGE_TYPE: ${process.env.STORAGE_TYPE}`,
            `  S3_STORAGE_BUCKET_NAME: ${s3Bucket || 'NOT SET (CRITICAL)'}`,
            `  S3_STORAGE_REGION: ${region || 'NOT SET (defaults to us-east-1)'}`,
            `  S3_STORAGE_ACCESS_KEY_ID: ${process.env.S3_STORAGE_ACCESS_KEY_ID ? 'SET' : 'NOT SET (will use IAM role)'}`,
            `  S3_STORAGE_SECRET_ACCESS_KEY: ${process.env.S3_STORAGE_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET (will use IAM role)'}`,
            '',
            'For detailed debugging, set DEBUG=true or VERBOSE=true to see S3 configuration logs.'
        ].join('\n')

        console.error(errorMsg) // Use console.error since logger might not be initialized yet
        throw new Error('S3 storage bucket configuration is missing - see console output for details')
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
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsServerStream] : [])
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
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsErrorStream] : [])
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
            : []),
        ...(process.env.STORAGE_TYPE === 'gcs' ? [gcsErrorStream] : [])
    ]
})

export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
    const unwantedLogURLs = ['/api/v1/node-icon/', '/api/v1/components-credentials-icon/', '/api/v1/ping']
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
