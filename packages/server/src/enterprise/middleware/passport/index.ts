import { HttpStatusCode } from 'axios'
import { RedisStore } from 'connect-redis'
import express, { NextFunction, Request, Response } from 'express'
import session from 'express-session'
import { StatusCodes } from 'http-status-codes'
import jwt, { JwtPayload, sign } from 'jsonwebtoken'
import passport from 'passport'
import { VerifiedCallback } from 'passport-jwt'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { IdentityManager } from '../../../IdentityManager'
import { Platform } from '../../../Interface'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { OrganizationUserStatus } from '../../database/entities/organization-user.entity'
import { GeneralRole } from '../../database/entities/role.entity'
import { WorkspaceUser, WorkspaceUserStatus } from '../../database/entities/workspace-user.entity'
import { ErrorMessage, IAssignedWorkspace, LoggedInUser } from '../../Interface.Enterprise'
import { AccountService } from '../../services/account.service'
import { OrganizationUserErrorMessage, OrganizationUserService } from '../../services/organization-user.service'
import { OrganizationService } from '../../services/organization.service'
import { RoleErrorMessage, RoleService } from '../../services/role.service'
import { WorkspaceUserService } from '../../services/workspace-user.service'
import { decryptToken, encryptToken, generateSafeCopy } from '../../utils/tempTokenUtils'
import { getAuthStrategy } from './AuthStrategy'
import { initializeDBClientAndStore, initializeRedisClientAndStore } from './SessionPersistance'
import { v4 as uuidv4 } from 'uuid'

const localStrategy = require('passport-local').Strategy

const jwtAudience = process.env.JWT_AUDIENCE || 'AUDIENCE'
const jwtIssuer = process.env.JWT_ISSUER || 'ISSUER'

const expireAuthTokensOnRestart = process.env.EXPIRE_AUTH_TOKENS_ON_RESTART === 'true'
const jwtAuthTokenSecret = process.env.JWT_AUTH_TOKEN_SECRET || 'auth_token'
const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET || process.env.JWT_AUTH_TOKEN_SECRET || 'refresh_token'

// Allow explicit override of cookie security settings
// This is useful when running behind a reverse proxy/load balancer that terminates SSL
const secureCookie =
    process.env.SECURE_COOKIES === 'false'
        ? false
        : process.env.SECURE_COOKIES === 'true'
        ? true
        : process.env.APP_URL?.startsWith('https')
        ? true
        : false
const jwtOptions = {
    secretOrKey: jwtAuthTokenSecret,
    audience: jwtAudience,
    issuer: jwtIssuer
}

const _initializePassportMiddleware = async (app: express.Application) => {
    // Configure session middleware
    let options: any = {
        secret: process.env.EXPRESS_SESSION_SECRET || 'flowise',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: secureCookie,
            httpOnly: true,
            sameSite: 'lax' // Add sameSite attribute
        }
    }

    // if the auth tokens are not to be expired on restart, then configure the session store
    if (!expireAuthTokensOnRestart) {
        // configure session store based on the mode
        if (process.env.MODE === 'queue') {
            const redisStore = initializeRedisClientAndStore()
            options.store = redisStore as RedisStore
        } else {
            // for the database store, choose store basis the DB configuration from .env
            const dbSessionStore = initializeDBClientAndStore()
            if (dbSessionStore) {
                options.store = dbSessionStore
            }
        }
    }

    app.use(session(options))
    app.use(passport.initialize())
    app.use(passport.session())

    if (options.store) {
        const appServer = getRunningExpressApp()
        appServer.sessionStore = options.store
    }

    passport.serializeUser((user: any, done) => {
        done(null, user)
    })

    passport.deserializeUser((user: any, done) => {
        done(null, user)
    })
}

export const initializeJwtCookieMiddleware = async (app: express.Application, identityManager: IdentityManager) => {
    await _initializePassportMiddleware(app)

    const strategy = getAuthStrategy(jwtOptions)
    passport.use(strategy)
    passport.use(
        'login',
        new localStrategy(
            {
                usernameField: 'email',
                passwordField: 'password',
                session: true
            },
            async (email: string, password: string, done: VerifiedCallback) => {
                let queryRunner
                try {
                    queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
                    await queryRunner.connect()
                    const accountService = new AccountService()
                    const body: any = {
                        user: {
                            email: email,
                            credential: password
                        }
                    }
                    const response = await accountService.login(body)
                    const workspaceUser: WorkspaceUser =
                        Array.isArray(response.workspaceDetails) && response.workspaceDetails.length > 0
                            ? response.workspaceDetails[0]
                            : (response.workspaceDetails as WorkspaceUser)
                    const workspaceUserService = new WorkspaceUserService()
                    workspaceUser.status = WorkspaceUserStatus.ACTIVE
                    workspaceUser.lastLogin = new Date().toISOString()
                    workspaceUser.updatedBy = workspaceUser.userId
                    const organizationUserService = new OrganizationUserService()
                    const { organizationUser } = await organizationUserService.readOrganizationUserByWorkspaceIdUserId(
                        workspaceUser.workspaceId,
                        workspaceUser.userId,
                        queryRunner
                    )
                    if (!organizationUser)
                        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
                    organizationUser.status = OrganizationUserStatus.ACTIVE
                    await workspaceUserService.updateWorkspaceUser(workspaceUser, queryRunner)
                    await organizationUserService.updateOrganizationUser(organizationUser)

                    const workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(organizationUser.userId, queryRunner)
                    const assignedWorkspaces: IAssignedWorkspace[] = workspaceUsers.map((workspaceUser) => {
                        return {
                            id: workspaceUser.workspace.id,
                            name: workspaceUser.workspace.name,
                            role: workspaceUser.role?.name,
                            organizationId: workspaceUser.workspace.organizationId
                        } as IAssignedWorkspace
                    })

                    let roleService = new RoleService()
                    const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                    const role = await roleService.readRoleById(workspaceUser.roleId, queryRunner)
                    if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

                    const orgService = new OrganizationService()
                    const organization = await orgService.readOrganizationById(organizationUser.organizationId, queryRunner)
                    if (!organization) {
                        return done('Organization not found')
                    }
                    const subscriptionId = organization.subscriptionId as string
                    const customerId = organization.customerId as string
                    const features = await identityManager.getFeaturesByPlan(subscriptionId)
                    const productId = await identityManager.getProductIdFromSubscription(subscriptionId)

                    const loggedInUser: LoggedInUser = {
                        id: workspaceUser.userId,
                        email: response.user.email,
                        name: response.user?.name,
                        roleId: workspaceUser.roleId,
                        activeOrganizationId: organization.id,
                        activeOrganizationSubscriptionId: subscriptionId,
                        activeOrganizationCustomerId: customerId,
                        activeOrganizationProductId: productId,
                        isOrganizationAdmin: workspaceUser.roleId === ownerRole.id,
                        activeWorkspaceId: workspaceUser.workspaceId,
                        activeWorkspace: workspaceUser.workspace.name,
                        assignedWorkspaces,
                        permissions: [...JSON.parse(role.permissions)],
                        features
                    }
                    return done(null, loggedInUser, { message: 'Logged in Successfully' })
                } catch (error) {
                    return done(error)
                } finally {
                    if (queryRunner) await queryRunner.release()
                }
            }
        )
    )

    app.post('/api/v1/auth/resolve', async (req, res) => {
        // check for the organization, if empty redirect to the organization setup page for OpenSource and Enterprise Versions
        // for Cloud (Horizontal) version, redirect to the signin page
        const expressApp = getRunningExpressApp()
        const platform = expressApp.identityManager.getPlatformType()
        if (platform === Platform.CLOUD) {
            return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/signin' })
        }
        const orgService = new OrganizationService()
        const queryRunner = expressApp.AppDataSource.createQueryRunner()
        await queryRunner.connect()
        const registeredOrganizationCount = await orgService.countOrganizations(queryRunner)
        await queryRunner.release()
        if (registeredOrganizationCount === 0) {
            switch (platform) {
                case Platform.ENTERPRISE:
                    if (!identityManager.isLicenseValid()) {
                        return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/license-expired' })
                    }
                    return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/organization-setup' })
                default:
                    return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/organization-setup' })
            }
        }
        switch (platform) {
            case Platform.ENTERPRISE:
                if (!identityManager.isLicenseValid()) {
                    return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/license-expired' })
                }
                return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/signin' })
            default:
                return res.status(HttpStatusCode.Ok).json({ redirectUrl: '/signin' })
        }
    })

    app.post('/api/v1/auth/refreshToken', async (req, res) => {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) return res.sendStatus(401)

        jwt.verify(refreshToken, jwtRefreshSecret, async (err: any, payload: any) => {
            if (err || !payload) return res.status(401).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
            // @ts-ignore
            const loggedInUser = req.user as LoggedInUser
            let isSSO = false
            let newTokenResponse: any = {}
            if (loggedInUser && loggedInUser.ssoRefreshToken) {
                try {
                    newTokenResponse = await identityManager.getRefreshToken(loggedInUser.ssoProvider, loggedInUser.ssoRefreshToken)
                    if (newTokenResponse.error) {
                        return res.status(401).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
                    }
                    isSSO = true
                } catch (error) {
                    return res.status(401).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
                }
            }
            const meta = decryptToken(payload.meta)
            if (!meta) {
                return res.status(401).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
            }
            if (isSSO) {
                loggedInUser.ssoToken = newTokenResponse.access_token
                if (newTokenResponse.refresh_token) {
                    loggedInUser.ssoRefreshToken = newTokenResponse.refresh_token
                }
                return setTokenOrCookies(res, loggedInUser, false, req, false, true)
            } else {
                return setTokenOrCookies(res, loggedInUser, false, req)
            }
        })
    })

    app.post('/api/v1/auth/login', (req, res, next?) => {
        passport.authenticate('login', async (err: any, user: LoggedInUser) => {
            try {
                if (err || !user) {
                    return next ? next(err) : res.status(401).json(err)
                }
                if (identityManager.isEnterprise() && !identityManager.isLicenseValid()) {
                    return res.status(401).json({ redirectUrl: '/license-expired' })
                }

                req.session.regenerate((regenerateErr) => {
                    if (regenerateErr) {
                        return next ? next(regenerateErr) : res.status(500).json({ message: 'Session regeneration failed' })
                    }

                    req.login(user, { session: true }, async (error) => {
                        if (error) {
                            return next ? next(error) : res.status(401).json(error)
                        }
                        return setTokenOrCookies(res, user, true, req)
                    })
                })
            } catch (error: any) {
                return next ? next(error) : res.status(401).json(error)
            }
        })(req, res, next)
    })
}

export const setTokenOrCookies = (
    res: Response,
    user: any,
    regenerateRefreshToken: boolean,
    req?: Request,
    redirect?: boolean,
    isSSO?: boolean
) => {
    const token = generateJwtAuthToken(user)
    let refreshToken: string = ''
    if (regenerateRefreshToken) {
        refreshToken = generateJwtRefreshToken(user)
    } else {
        refreshToken = req?.cookies?.refreshToken
    }
    const returnUser = generateSafeCopy(user)
    returnUser.isSSO = !isSSO ? false : isSSO

    if (redirect) {
        // 1. Generate a random token
        const ssoToken = uuidv4()

        // 2. Store returnUser in your session store, keyed by ssoToken, with a short expiry
        storeSSOUserPayload(ssoToken, returnUser)
        // 3. Redirect with token only
        const dashboardUrl = `/sso-success?token=${ssoToken}`

        // Return the token as a cookie in our response.
        let resWithCookies = res
            .cookie('token', token, {
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax'
            })
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax'
            })
        resWithCookies.redirect(dashboardUrl)
    } else {
        // Return the token as a cookie in our response.
        res.cookie('token', token, {
            httpOnly: true,
            secure: secureCookie,
            sameSite: 'lax'
        })
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax'
            })
            .type('json')
            .send({ ...returnUser })
    }
}

export const generateJwtAuthToken = (user: any) => {
    let expiryInMinutes = -1
    if (user?.ssoToken) {
        const jwtHeader = jwt.decode(user.ssoToken, { complete: true })
        if (jwtHeader) {
            const utcSeconds = (jwtHeader.payload as any).exp
            let d = new Date(0) // The 0 there is the key, which sets the date to the epoch
            d.setUTCSeconds(utcSeconds)
            // get the minutes difference from current time
            expiryInMinutes = Math.abs(d.getTime() - new Date().getTime()) / 60000
        }
    }
    if (expiryInMinutes === -1) {
        expiryInMinutes = process.env.JWT_TOKEN_EXPIRY_IN_MINUTES ? parseInt(process.env.JWT_TOKEN_EXPIRY_IN_MINUTES) : 60
    }
    return _generateJwtToken(user, expiryInMinutes, jwtAuthTokenSecret)
}

export const generateJwtRefreshToken = (user: any) => {
    let expiryInMinutes = -1
    if (user.ssoRefreshToken) {
        const jwtHeader = jwt.decode(user.ssoRefreshToken, { complete: false })
        if (jwtHeader && typeof jwtHeader !== 'string') {
            const utcSeconds = (jwtHeader as JwtPayload).exp
            if (utcSeconds) {
                let d = new Date(0) // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(utcSeconds)
                // get the minutes difference from current time
                expiryInMinutes = Math.abs(d.getTime() - new Date().getTime()) / 60000
            }
        }
    }
    if (expiryInMinutes === -1) {
        expiryInMinutes = process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES
            ? parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES)
            : 129600 // 90 days
    }
    return _generateJwtToken(user, expiryInMinutes, jwtRefreshSecret)
}

const _generateJwtToken = (user: Partial<LoggedInUser>, expiryInMinutes: number, secret: string) => {
    const encryptedUserInfo = encryptToken(user?.id + ':' + user?.activeWorkspaceId)
    return sign({ id: user?.id, username: user?.name, meta: encryptedUserInfo }, secret!, {
        expiresIn: expiryInMinutes + 'm', // Expiry in minutes
        notBefore: '0', // Cannot use before now, can be configured to be deferred.
        algorithm: 'HS256', // HMAC using SHA-256 hash algorithm
        audience: jwtAudience, // The audience of the token
        issuer: jwtIssuer // The issuer of the token
    })
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: true }, (err: any, user: LoggedInUser, info: object) => {
        if (err) {
            return next(err)
        }

        // @ts-ignore
        if (info && info.name === 'TokenExpiredError') {
            if (req.cookies && req.cookies.refreshToken) {
                return res.status(401).json({ message: ErrorMessage.TOKEN_EXPIRED, retry: true })
            }
            return res.status(401).json({ message: ErrorMessage.INVALID_MISSING_TOKEN })
        }

        if (!user) {
            return res.status(401).json({ message: ErrorMessage.INVALID_MISSING_TOKEN })
        }

        const identityManager = getRunningExpressApp().identityManager
        if (identityManager.isEnterprise() && !identityManager.isLicenseValid()) {
            return res.status(401).json({ redirectUrl: '/license-expired' })
        }

        req.user = user
        next()
    })(req, res, next)
}

const storeSSOUserPayload = (ssoToken: string, returnUser: any) => {
    const app = getRunningExpressApp()
    app.cachePool.addSSOTokenCache(ssoToken, returnUser)
}
