import { NextFunction, Request, Response } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'
import Stripe from 'stripe'

import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import { Organization } from '../../database/entities/Organization'
import apikeyService from '../../services/apikey'

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

        return user
    } catch (error) {
        throw new Error('Invalid API key')
    }
}

export const authenticationHandlerMiddleware =
    ({ whitelistURLs, AppDataSource }: { whitelistURLs: string[]; AppDataSource: DataSource }) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const startTime = new Date().getTime()
        const requireAuth = /\/api\/v1\//i.test(req.url) && !whitelistURLs.some((url) => req.url.includes(url))
        const jwtMiddleware = requireAuth ? jwtCheck : jwtCheckPublic

        // Check if there are any cookies for Authorization and inject them into the request
        const authCookie = req.cookies?.Authorization
        if (authCookie) {
            req.headers.Authorization = authCookie
            console.log('[AuthMiddleware] Using auth cookie for authentication')
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
            req.user = apiKeyUser
            // return next()
        }

        // Fall back to JWT authentication
        jwtMiddleware(req, res, async (jwtError?: any) => {
            if (!req.user) {
                if (jwtError) {
                    console.log('[AuthMiddleware] JWT error:', jwtError)
                    return next(jwtError)
                }

                // Proceed with user synchronization if user is authenticated
                if (!req.auth?.payload) {
                    console.log('[AuthMiddleware] No auth payload present, proceeding without authentication')
                    if (apiKeyError) {
                        console.error('[AuthMiddleware] Error verifying API key:', apiKeyError)
                    }
                    return next()
                }

                // Update the cookies with the authorization token for future requests with low expiry time
                res.cookie('Authorization', req.headers.authorization, { maxAge: 900000, httpOnly: true, secure: true })

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

                // Get user from auth payload
                const authUser = req.auth.payload
                const auth0Id = authUser.sub
                const email = authUser.email as string
                const name = authUser.name as string
                const roles = (authUser?.['https://theanswer.ai/roles'] || []) as string[]
                if (!auth0Id || !email) {
                    console.log('[AuthMiddleware] Missing required auth fields (auth0Id or email)')
                    return next()
                }

                // Get organization from auth payload
                const orgRepo = AppDataSource.getRepository(Organization)
                let organization = await orgRepo.findOneBy({ name: authUser.org_name })
                if (!organization) {
                    organization = orgRepo.create({ auth0Id: userOrgId, name: authUser.org_name })
                }

                if (organization.auth0Id !== userOrgId || organization.name !== authUser.org_name) {
                    organization.name = authUser.org_name
                    organization.auth0Id = userOrgId
                    await orgRepo.save(organization)
                }
                const userRepo = AppDataSource.getRepository(User)
                let user = await userRepo.findOneBy({ auth0Id })

                if (!user) {
                    // console.log(`[AuthMiddleware] Creating new user: ${auth0Id}`)
                    user = userRepo.create({ auth0Id, email, name, organizationId: organization.id })
                }

                if (user.email !== email || user.name !== name || user.organizationId !== organization.id) {
                    // console.log(`[AuthMiddleware] Updating existing user: ${user.id}`)
                    user.email = email
                    user.name = name
                    user.organizationId = organization.id
                    await userRepo.save(user)
                }
                // Upsert customer on Stripe if no customerId is attached
                //  TODO: For organization specific users, we should NOT create a customer and instead link it to the org customer
                let stripeCustomerId = user.stripeCustomerId
                if (!stripeCustomerId) {
                    if (organization.stripeCustomerId && organization.billingPoolEnabled == true) {
                        stripeCustomerId = organization.stripeCustomerId
                    } else {
                        try {
                            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

                            const customer = await stripe.customers.create({
                                email,
                                name,
                                metadata: {
                                    userId: user.id,
                                    auth0Id,
                                    orgId: organization.id
                                }
                            })
                            stripeCustomerId = customer.id
                            // Optionally, update the user profile in your database with the new customerId
                        } catch (error) {
                            console.error('Error creating/updating Stripe customers:', error)
                            return res.status(500).send('Internal Server Error')
                        }
                        user.stripeCustomerId = stripeCustomerId
                        await userRepo.save(user)
                    }
                }
                req.user = { ...authUser, ...user, roles }
            }
            console.log(
                `[AuthMiddleware] Auth successful for user: ${req.user?.id} with ${apiKeyUser ? 'APIKEY' : 'JWT'} in ${
                    new Date().getTime() - startTime
                }ms`
            )
            return next()
        })
    }

export default authenticationHandlerMiddleware
