import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../errors/apiError'

async function errorMiddleware(err: ApiError, req: Request, res: Response, next: NextFunction) {
    // Provide error stack trace only in development
    var executionEnvironment = process.env.NODE_ENV || 'development'
    res.locals.message = err.message
    res.locals.error = err
    const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    let displayedError = {
        success: false,
        message: err.message,
        stack: err.stack
    }
    if (executionEnvironment !== 'development') {
        res.locals.error = ''
        displayedError.stack = ''
    }
    res.status(statusCode).json(displayedError)
}

export default errorMiddleware
