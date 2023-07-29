import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'

const { combine, timestamp, printf, errors } = format

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
    new transports.Console()
  ]
})

export function expressRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const unwantedLogURLs = ['/api/v1/node-icon/']
  if (req.url.includes('/api/v1/') && !unwantedLogURLs.some((url) => req.url.includes(url))) {
    logger.info(`${req.method} ${req.url}`)
  }
  next()
}

export default logger
