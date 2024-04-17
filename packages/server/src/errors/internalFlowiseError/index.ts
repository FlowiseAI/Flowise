export class InternalFlowiseError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
        super(message)
        this.statusCode = statusCode
        // capture the stack trace of the error from anywhere in the application
        Error.captureStackTrace(this, this.constructor)
    }
}
