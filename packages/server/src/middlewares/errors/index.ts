import { NextFunction, Request, Response } from 'express'

async function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    //@ts-ignore
    res.status(err.statusCode || 500)
    res.json({
        message: err.message
    })
}

export default errorMiddleware
