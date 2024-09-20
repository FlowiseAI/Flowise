import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// we need eslint because we have to pass next arg for the error middleware
// eslint-disable-next-line
async function errorHandlerMiddleware(err: InternalFlowiseError, req: Request, res: Response, next: NextFunction) {
    let displayedError = {
        statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        success: false,
        message: err.message,
        // Provide error stack trace only in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    }
    if (!req.body.streaming || req.body.streaming === 'false') {
        res.setHeader('Content-Type', 'application/json')
        res.status(displayedError.statusCode).json(displayedError)
    }
}

export default errorHandlerMiddleware
