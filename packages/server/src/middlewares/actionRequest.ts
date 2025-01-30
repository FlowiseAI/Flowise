import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Validation schemas
const updateActionRequestSchema = z.object({
    status: z.enum(['completed', 'expired', 'cancelled']),
    response: z.record(z.any()).optional()
})

export const validateUpdateActionRequest = (req: Request, res: Response, next: NextFunction) => {
    try {
        updateActionRequestSchema.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: error.errors
            })
        }
        return res.status(400).json({ error: 'Invalid request body' })
    }
}

// Parameter validation
export const validateActionRequestParams = (req: Request, res: Response, next: NextFunction) => {
    const { actionId, flowId, sessionId } = req.params
    
    if (actionId && !isValidUUID(actionId)) {
        return res.status(400).json({ error: 'Invalid action ID format' })
    }
    
    if (flowId && !isValidUUID(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID format' })
    }
    
    if (sessionId && !isValidUUID(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' })
    }
    
    next()
}

// Helper function to validate UUID format
function isValidUUID(uuid: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
} 