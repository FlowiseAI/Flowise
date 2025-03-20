import { NextFunction, Request, Response } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'
import Stripe from 'stripe'

import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import { Organization } from '../../database/entities/Organization'
import apikeyService from '../../services/apikey'
import { QueryFailedError } from 'typeorm'

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

/**
 * Safely creates or updates a user with proper transaction handling to prevent race conditions
 */
const findOrCreateUser = async (
    AppDataSource: DataSource,
    auth0Id: string,
    email: string,
    name: string,
    organizationId: string
): Promise<User> => {
    const userRepo = AppDataSource.getRepository(User)

    // First, try to find the user
    let user = await userRepo.findOneBy({ auth0Id })
    if (user) {
        // Update user if needed and return
        if (user.email !== email || user.name !== name || user.organizationId !== organizationId) {
            user.email = email
            user.name = name
            user.organizationId = organizationId
            await userRepo.save(user)
        }
        return user
    }

    // User not found, try to create with transaction and retry logic
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
        const queryRunner = AppDataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Check again inside transaction to prevent race condition
            const existingUser = await queryRunner.manager.findOneBy(User, { auth0Id })
            if (existingUser) {
                await queryRunner.release()
                return existingUser
            }

            // Create new user
            const newUser = userRepo.create({ auth0Id, email, name, organizationId })
            const savedUser = await queryRunner.manager.save(newUser)

            await queryRunner.commitTransaction()
            await queryRunner.release()

            console.log(`[AuthMiddleware] Successfully created new user: ${savedUser.id}`)
            return savedUser
        } catch (error) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()

            // If duplicate key error, retry after a short delay
            if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
                retryCount++
                console.log(`[AuthMiddleware] Duplicate key error, retrying (${retryCount}/${maxRetries})`)
                await new Promise((resolve) => setTimeout(resolve, 100 * retryCount)) // Exponential backoff

                // Try to get the user that was created in parallel
                user = await userRepo.findOneBy({ auth0Id })
                if (user) {
                    return user
                }
            } else {
                throw error
            }
        }
    }

    // Last attempt to find user after retries
    user = await userRepo.findOneBy({ auth0Id })
    if (user) {
        return user
    }

    throw new Error(`Failed to create or find user with auth0Id: ${auth0Id} after ${maxRetries} retries`)
}

/**
 * Safely creates or updates an organization with proper transaction handling
 */
const findOrCreateOrganization = async (AppDataSource: DataSource, auth0OrgId: string, orgName: string): Promise<Organization> => {
    const orgRepo = AppDataSource.getRepository(Organization)

    let organization = await orgRepo.findOneBy({ auth0Id: auth0OrgId })

    if (organization) {
        if (organization.name !== orgName) {
            organization.name = orgName
            await orgRepo.save(organization)
        }
        return organization
    }

    // Organization not found, create with transaction
    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
        // Check again inside transaction
        organization = await queryRunner.manager.findOneBy(Organization, { auth0Id: auth0OrgId })
        if (organization) {
            await queryRunner.release()
            return organization
        }

        // Create new organization
        const newOrg = orgRepo.create({ auth0Id: auth0OrgId, name: orgName })
        organization = await queryRunner.manager.save(newOrg)

        await queryRunner.commitTransaction()
        await queryRunner.release()

        return organization
    } catch (error) {
        await queryRunner.rollbackTransaction()
        await queryRunner.release()

        if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
            // If duplicate key, try to fetch the existing organization
            organization = await orgRepo.findOneBy({ auth0Id: auth0OrgId })
            if (organization) {
                return organization
            }
        }

        throw error
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

                try {
                    // Get or create organization using transaction-safe method
                    const organization = await findOrCreateOrganization(AppDataSource, userOrgId, authUser.org_name)

                    // Get or create user using transaction-safe method
                    const user = await findOrCreateUser(AppDataSource, auth0Id, email, name, organization.id)

                    // Upsert customer on Stripe if no customerId is attached
                    let stripeCustomerId = user.stripeCustomerId
                    if (!stripeCustomerId) {
                        if (organization.stripeCustomerId && organization.billingPoolEnabled == true) {
                            stripeCustomerId = organization.stripeCustomerId
                        } else {
                            try {
                                const stripe = new Stripe(process.env.BILLING_STRIPE_SECRET_KEY ?? '')

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
                            await AppDataSource.getRepository(User).save(user)
                        }
                    }
                    req.user = { ...authUser, ...user, roles }
                } catch (error) {
                    console.error('[AuthMiddleware] Error during user authentication:', error)
                    return res.status(500).send('Internal Server Error during authentication')
                }
            }

            // console.log(
            //     `[AuthMiddleware] Auth successful for user: ${req.user?.id} with ${apiKeyUser ? 'APIKEY' : 'JWT'} in ${
            //         new Date().getTime() - startTime
            //     }ms`
            // )
            return next()
        })
    }

export default authenticationHandlerMiddleware
