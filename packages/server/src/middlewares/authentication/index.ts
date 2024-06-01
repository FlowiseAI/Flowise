import { NextFunction, Request, Response } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'

import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'

const jwtCheck = auth({
    authRequired: false,
    secret: process.env.AUTH0_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG
})
const jwtCheckPublic = auth({
    authRequired: false,
    secret: process.env.AUTH0_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG
})
export const authenticationHandlerMiddleware =
    ({ whitelistURLs, AppDataSource }: { whitelistURLs: string[]; AppDataSource: DataSource }) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const requireAuth = /\/api\/v1\//i.test(req.url) && !whitelistURLs.some((url) => req.url.includes(url))
        const jwtMiddleware = requireAuth ? jwtCheck : jwtCheckPublic
        // Check if there are any cookies for Authorization and inject them into the request
        const authCookie = req.cookies?.Authorization
        if (authCookie) {
            req.headers.Authorization = authCookie
        }
        // First, run the JWT middleware
        jwtMiddleware(req, res, async (jwtError?: any) => {
            if (jwtError) {
                return next(jwtError) // Handle JWT error
            }

            // Proceed with user synchronization if user is authenticated
            if (!req.auth?.payload) {
                return next() // Skip if no authentication info is present
            }

            // Update the cookies with the authorization token for future requests with low expiry time
            res.cookie('Authorization', req.headers.authorization, { maxAge: 900000, httpOnly: true, secure: true })

            // Check for organization match if required
            if (requireAuth) {
                const isInvalidOrg =
                    (!!process.env.AUTH0_ORGANIZATION_ID || !!req?.auth?.payload?.org_id) &&
                    process.env.AUTH0_ORGANIZATION_ID !== req?.auth?.payload?.org_id
                if (isInvalidOrg) {
                    return res.status(401).send("Unauthorized: Organization doesn't match")
                }
            }
            const authUser = req.auth.payload
            const auth0Id = authUser.sub
            const email = authUser.email as string
            const name = authUser.name as string

            if (!auth0Id || !email) {
                return next()
            }

            let user = await AppDataSource.getRepository(User).findOneBy({ auth0Id })
            if (!user) {
                user = new User()
                user.auth0Id = auth0Id
                user.email = email
                user.name = name
                await AppDataSource.getRepository(User).save(user)
            } else {
                // Update existing user if needed
                user.email = email
                user.name = name
                await AppDataSource.getRepository(User).save(user)
            }

            req.user = user // Attach user entity to request for downstream use
            return next()
        })
    }

export default authenticationHandlerMiddleware
