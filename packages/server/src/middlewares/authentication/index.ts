import { NextFunction, Request, Response } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'

import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import { Organization } from '../../database/entities/Organization'
import apikeyService from '../../services/apikey'
import { findOrCreateOrganization } from './findOrCreateOrganization'
import { findOrCreateUser } from './findOrCreateUser'
import { ensureStripeCustomerForUser } from './ensureStripeCustomerForUser'
import { findOrCreateDefaultChatflowsForUser } from './findOrCreateDefaultChatflowsForUser'

const jwtCheck = auth({
    authRequired: true,
    secret: process.env.AUTH0_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG ?? 'HS256'
})

const jwtCheckPublic = auth({
    authRequired: false,
    secret: process.env.AUTH0_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG ?? 'HS256'
})

const tryApiKeyAuth = async (req: Request, AppDataSource: DataSource): Promise<User | null> => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        return null
    }

    const apiKey = authHeader.split(' ')[1]
    try {
        const apiKeyData = await apikeyService.verifyApiKey(apiKey)
        if (!apiKeyData) {
            return null
        }

        // Get user from API key's userId
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: apiKeyData.userId }
        })

        if (!user) {
            return null
        }

        return user
    } catch (error) {
        throw new Error('Invalid API key')
    }
}

export const authenticationHandlerMiddleware =
    ({ whitelistURLs, AppDataSource }: { whitelistURLs: string[]; AppDataSource: DataSource }) =>
    async (req: Request, res: Response, next: NextFunction) => {
        /**
         * Organization-Based Authentication Security Model:
         *
         * 1. Protected Routes (requireAuth = true):
         *    - Valid org users: Full authentication and user creation
         *    - Invalid org users: 401 Unauthorized
         *    - API key with invalid org: 401 Unauthorized
         *
         * 2. Public Routes (requireAuth = false):
         *    - Valid org JWT users: Full authentication and user creation
         *    - Invalid org JWT users: Treated as anonymous (req.user = undefined)
         *    - API key users: Full access regardless of org
         *
         * This ensures only authorized organization users can access protected
         * resources while maintaining public access for cross-org scenarios.
         */

        // const startTime = new Date().getTime()
        const requireAuth = /\/api\/v1\//i.test(req.url) && !whitelistURLs.some((url) => req.url.includes(url))
        const jwtMiddleware = requireAuth ? jwtCheck : jwtCheckPublic

        // Check if there are any cookies for Authorization and inject them into the request
        const authCookie = req.cookies?.Authorization
        if (authCookie) {
            req.headers.Authorization = authCookie
        }

        // Try API key authentication first
        let apiKeyUser: User | null = null
        let apiKeyError: any
        try {
            apiKeyUser = await tryApiKeyAuth(req, AppDataSource)
        } catch (error) {
            apiKeyError = error
        }

        if (apiKeyUser) {
            // For API key users, we need to get the organization's auth0Id
            const organization = await AppDataSource.getRepository(Organization).findOne({
                where: { id: apiKeyUser.organizationId }
            })

            const isValidApiKeyOrg = organization?.auth0Id && process.env.AUTH0_ORGANIZATION_ID?.split(',')?.includes(organization.auth0Id)

            if (requireAuth && !isValidApiKeyOrg) {
                return res.status(401).send("Unauthorized: API key organization doesn't match")
            }

            // Store API key user with additional auth0 org info
            req.user = apiKeyUser as any
            ;(req.user as any).auth0OrgId = organization?.auth0Id
            return next()
        }

        // Fall back to JWT authentication
        jwtMiddleware(req, res, async (jwtError?: any) => {
            if (!req.user) {
                if (jwtError) {
                    return next(jwtError)
                }

                // Proceed with user synchronization if user is authenticated
                if (!req.auth?.payload) {
                    if (apiKeyError) {
                        console.error('Error verifying API key:', apiKeyError)
                    }
                    return next()
                }

                // Update the cookies with the authorization token for future requests with low expiry time
                res.cookie('Authorization', req.headers.authorization, { maxAge: 900000, httpOnly: true, secure: true })

                // Check for organization match if required
                const userOrgId = req?.auth?.payload?.org_id
                const isValidOrg = userOrgId && process.env.AUTH0_ORGANIZATION_ID?.split(',')?.includes(userOrgId)
                if (requireAuth && !isValidOrg) {
                    return res.status(401).send("Unauthorized: Organization doesn't match")
                }

                // Get user from auth payload
                const authUser = req.auth.payload
                const auth0Id = authUser.sub
                const email = authUser.email as string
                const name = authUser.name as string
                const roles = (authUser?.['https://theanswer.ai/roles'] || []) as string[]
                if (!auth0Id || !email) {
                    return next()
                }

                try {
                    if (isValidOrg) {
                        // Get or create organization using transaction-safe method
                        const organization = await findOrCreateOrganization(AppDataSource, userOrgId, authUser.org_name)

                        // Get or create user using transaction-safe method
                        let user = await findOrCreateUser(AppDataSource, auth0Id, email, name, organization.id)

                        // Replace the Stripe customer logic with the new ensureStripeCustomerForUser function
                        user = await ensureStripeCustomerForUser(AppDataSource, user, organization, auth0Id, email, name)

                        // Find or create default chatflows for the user
                        const defaultChatflowId = await findOrCreateDefaultChatflowsForUser(AppDataSource, user)
                        // Update user with the latest defaultChatflowId
                        if (defaultChatflowId) {
                            user.defaultChatflowId = defaultChatflowId
                        }

                        // Set permissions based on roles
                        const permissions: string[] = []
                        if (roles?.includes('Admin')) {
                            permissions.push('org:manage')
                        }

                        req.user = { ...authUser, ...user, roles, permissions }
                    } else {
                        // User authenticated but from unauthorized organization - treat as anonymous user
                        console.warn(`Auth: User ${email} from org '${userOrgId}' treated as anonymous - not in allowed orgs`)
                        req.user = undefined
                    }
                } catch (error) {
                    console.error('Authentication error:', error)
                    return res.status(500).send('Internal Server Error during authentication')
                }
            }

            // Handle /auth/me endpoint directly in middleware
            if (req.url === '/api/v1/auth/me' && req.method === 'GET') {
                if (!req.user) {
                    return res.status(401).json({ error: 'Unauthorized' })
                }
                // For JWT users, org_id comes from auth payload. For API key users, we need to check the organization
                const userAuth0OrgId = (req.user as any).org_id || (req.user as any).auth0OrgId
                const isValidOrg = userAuth0OrgId && process.env.AUTH0_ORGANIZATION_ID?.split(',')?.includes(userAuth0OrgId)
                if (!isValidOrg) {
                    return res.status(401).json({ error: 'Unauthorized' })
                }

                try {
                    // Get organization data
                    const organization = await AppDataSource.getRepository(Organization).findOne({
                        where: { id: req.user.organizationId }
                    })

                    // Determine auth method
                    const authMethod = apiKeyUser ? 'apikey' : 'jwt'

                    return res.json({
                        user: {
                            id: req.user.id,
                            name: req.user.name,
                            email: req.user.email,
                            organizationId: req.user.organizationId,
                            stripeCustomerId: req.user.stripeCustomerId,
                            defaultChatflowId: req.user.defaultChatflowId,
                            createdDate: req.user.createdDate,
                            updatedDate: req.user.updatedDate,
                            roles: req.user.roles || []
                        },
                        organization: organization
                            ? {
                                  id: organization.id,
                                  name: organization.name,
                                  stripeCustomerId: organization.stripeCustomerId,
                                  createdDate: organization.createdDate,
                                  updatedDate: organization.updatedDate
                              }
                            : null,
                        session: {
                            authenticated: true,
                            authMethod
                        }
                    })
                } catch (error) {
                    console.error('Error in /auth/me endpoint:', error)
                    return res.status(500).json({ error: 'Internal Server Error' })
                }
            }

            return next()
        })
    }

export default authenticationHandlerMiddleware
