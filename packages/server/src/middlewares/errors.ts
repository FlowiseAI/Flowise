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
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // ... existing error handling ...

    // Handle ActionRequest errors
    if (err instanceof ActionRequestNotFoundError) {
        return res.status(404).json({ error: err.message })
    }

    if (err instanceof ActionRequestValidationError) {
        return res.status(400).json({ error: err.message })
    }

    if (err instanceof ActionRequestError) {
        return res.status(500).json({ error: err.message })
    }

    // ... existing error handling ...
} 