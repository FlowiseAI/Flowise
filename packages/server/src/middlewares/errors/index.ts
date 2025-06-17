import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// eslint-disable-next-line
export default function errorHandlerMiddleware(err: Error | InternalFlowiseError, req: Request, res: Response, next: NextFunction) {
    const statusCode = (err as InternalFlowiseError).statusCode || res.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    if (err.message.includes('401 Incorrect API key provided')) {
        err.message = '401 Invalid model key or Incorrect local model configuration.'
    }
    const displayedError = {
        statusCode,
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    }

    if (res.headersSent) {
        return next(err)
    }

    if (!req.body || !req.body.streaming || req.body.streaming === 'false') {
        res.setHeader('Content-Type', 'application/json')
        res.status(statusCode).json(displayedError)
    }
}
