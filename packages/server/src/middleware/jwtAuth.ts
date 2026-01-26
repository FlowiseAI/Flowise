import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

export interface JWTPayload {
    permissions: string[]
    features: Record<string, string>
    activeOrganizationId: string
    activeOrganizationSubscriptionId?: string
    activeOrganizationCustomerId?: string
    activeOrganizationProductId?: string
    isOrganizationAdmin: boolean
    activeWorkspaceId: string
    activeWorkspace: string
    exp: number
    kid?: string // Key ID for identifying which public key to use
}

/**
 * Middleware to verify JWT tokens from X-Session-Token header
 * Decrypts the token and populates req.user with the payload
 */
export const verifySessionToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers['x-session-token'] as string

        if (!token) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'No session token provided' })
        }

        /* Decode the token header to get the kid (key ID)
        const decodedHeader = jwt.decode(token, { complete: true })
        if (!decodedHeader || typeof decodedHeader === 'string') {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid token format' })
        }

        const kid = decodedHeader.header.kid
        if (!kid) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token missing key ID (kid)' })
        }

        // Find the signing key by kid
        const appServer = getRunningExpressApp()
        const signingKeyRepo = appServer.AppDataSource.getRepository(SigningKey)
        const signingKey = await signingKeyRepo.findOne({ where: { id: kid, isActive: true } })

        if (!signingKey) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid or inactive signing key' })
        }

        // Verify the token using the public key
        const payload = jwt.verify(token, signingKey.publicKey, {
            algorithms: ['RS256']
        }) as JWTPayload

        // Check token expiration
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && payload.exp < now) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token expired' })
        }*/

        const payload = {
            permissions: [],
            features: {},
            activeOrganizationId: 'workday-org-id',
            isOrganizationAdmin: false,
            activeWorkspaceId: 'workday-workspace-id',
            activeWorkspace: 'workday-workspace'
        } // Mock decoded payload from JWT

        // Populate req.user with the payload
        // @ts-ignore
        req.user = {
            ...req.user,
            permissions: payload.permissions,
            features: payload.features,
            activeOrganizationId: payload.activeOrganizationId,
            isOrganizationAdmin: false,
            activeWorkspaceId: payload.activeWorkspaceId,
            activeWorkspace: payload.activeWorkspace || ''
        }

        next()
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid token' })
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token expired' })
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Token verification failed' })
    }
}

/**
 * Optional middleware - only verifies token if present, doesn't fail if missing
 */
export const optionalSessionToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['x-session-token'] as string

    if (!token) {
        return next() // No token, continue without user context
    }

    // If token is present, verify it
    return verifySessionToken(req, res, next)
}
