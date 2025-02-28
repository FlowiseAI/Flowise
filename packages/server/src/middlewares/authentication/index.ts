import { NextFunction, Request, Response } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'
import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import { Organization } from '../../database/entities/Organization'
import apikeyService from '../../services/apikey'

const jwtCheck = auth({
    authRequired: true,
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

const tryApiKeyAuth = async (req: Request, AppDataSource: DataSource): Promise<User | null> => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        console.log('[AuthMiddleware] No Bearer token found in Authorization header')
        return null
    }

    const apiKey = authHeader.split(' ')[1]
    try {
        const apiKeyData = await apikeyService.verifyApiKey(apiKey)
        if (!apiKeyData) {
            console.log('[AuthMiddleware] Invalid API key')
            return null
        }

        // Get user from API key's userId
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: apiKeyData.userId }
        })

        if (!user) {
            console.log(`[AuthMiddleware] No user found for API key userId: ${apiKeyData.userId}`)
            return null
        }

        console.log(`[AuthMiddleware] Successfully authenticated API key for user: ${user.email}`)
        return user
    } catch (error) {
        console.error('[AuthMiddleware] Error verifying API key:', error)
        return null
    }
}

export const authenticationHandlerMiddleware =
    ({ whitelistURLs, AppDataSource }: { whitelistURLs: string[]; AppDataSource: DataSource }) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const requireAuth = /\/api\/v1\//i.test(req.url) && !whitelistURLs.some((url) => req.url.includes(url))
        const jwtMiddleware = requireAuth ? jwtCheck : jwtCheckPublic

        // Check if there are any cookies for Authorization and inject them into the request
        const authCookie = req.cookies?.Authorization
        if (authCookie) {
            req.headers.Authorization = authCookie
            console.log('[AuthMiddleware] Using auth cookie for authentication')
        }

        // Try API key authentication first
        const apiKeyUser = await tryApiKeyAuth(req, AppDataSource)
        if (apiKeyUser) {
            console.log(`[AuthMiddleware] Authenticated via API key for user: ${apiKeyUser.email}`)
            req.user = apiKeyUser
            return next()
        }

        // Fall back to JWT authentication
        jwtMiddleware(req, res, async (jwtError?: any) => {
            if (jwtError) {
                console.log('[AuthMiddleware] JWT error:', jwtError)
                return next(jwtError)
            }

            // Proceed with user synchronization if user is authenticated
            if (!req.auth?.payload) {
                console.log('[AuthMiddleware] No auth payload present, proceeding without authentication')
                return next()
            }

            // Update the cookies with the authorization token for future requests with low expiry time
            res.cookie('Authorization', req.headers.authorization, { maxAge: 900000, httpOnly: true, secure: true })
            console.log('[AuthMiddleware] Updated auth cookie')

            // Check for organization match if required
            const userOrgId = req?.auth?.payload?.org_id
            if (requireAuth) {
                const validOrgs = process.env.AUTH0_ORGANIZATION_ID?.split(',') || []
                const isInvalidOrg = validOrgs?.length > 0 && !validOrgs.includes(userOrgId)
                if (isInvalidOrg) {
                    console.log(`[AuthMiddleware] Organization validation failed for org ID: ${userOrgId}`)
                    return res.status(401).send("Unauthorized: Organization doesn't match")
                }
            }

            const authUser = req.auth.payload
            const userOrgName = authUser.org_name
            const auth0Id = authUser.sub
            const email = authUser.email as string
            const name = authUser.name as string
            const roles = (authUser?.['https://theanswer.ai/roles'] || []) as string[]

            if (!auth0Id || !email) {
                console.log('[AuthMiddleware] Missing required auth fields (auth0Id or email)')
                return next()
            }

            const orgRepo = AppDataSource.getRepository(Organization)
            let organization = await orgRepo.findOneBy({ name: userOrgName })
            if (!organization) {
                console.log(`[AuthMiddleware] Creating new organization: ${userOrgName}`)
                organization = orgRepo.create({ auth0Id: userOrgId, name: userOrgName })
            } else {
                console.log(`[AuthMiddleware] Updating existing organization: ${userOrgName}`)
                organization.name = userOrgName
                organization.auth0Id = userOrgId
            }
            await orgRepo.save(organization)

            const userRepo = AppDataSource.getRepository(User)
            let user = await userRepo.findOneBy({ auth0Id })
            if (!user) {
                console.log(`[AuthMiddleware] Creating new user: ${email}`)
                user = userRepo.create({ auth0Id, email, name, organizationId: organization.id })
            } else {
                console.log(`[AuthMiddleware] Updating existing user: ${email}`)
                user.email = email
                user.name = name
                user.organizationId = organization.id
            }

            await userRepo.save(user)

            req.user = { ...authUser, ...user, roles }
            console.log(`[AuthMiddleware] Successfully authenticated user: ${email} with roles: ${roles.join(', ')}`)
            return next()
        })
    }

export default authenticationHandlerMiddleware
