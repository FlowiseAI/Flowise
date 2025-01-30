import { Request, Response, NextFunction } from 'express'

// Add ActionRequest error types
export class ActionRequestError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ActionRequestError'
    }
}

export class ActionRequestNotFoundError extends ActionRequestError {
    constructor(actionId: string) {
        super(`Action request not found: ${actionId}`)
        this.name = 'ActionRequestNotFoundError'
    }
}

export class ActionRequestValidationError extends ActionRequestError {
    constructor(message: string) {
        super(message)
        this.name = 'ActionRequestValidationError'
    }
}

// Update error handler middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    // Handle ActionRequest errors
    if (err instanceof ActionRequestNotFoundError) {
        res.status(404).json({ error: err.message })
        return
    }

    if (err instanceof ActionRequestValidationError) {
        res.status(400).json({ error: err.message })
        return
    }

    if (err instanceof ActionRequestError) {
        res.status(500).json({ error: err.message })
        return
    }

    // Default error handler
    res.status(500).json({ error: 'Internal server error' })
} 