// Auth0SSO.ts
import SSOBase from './SSOBase'
import passport from 'passport'
import { Profile, Strategy as Auth0Strategy } from 'passport-auth0'
import { Request } from 'express'
import auditService from '../services/audit'
import { ErrorMessage, LoggedInUser, LoginActivityCode } from '../Interface.Enterprise'
import { setTokenOrCookies } from '../middleware/passport'
import axios from 'axios'

const PROVIDER_NAME_AUTH0_SSO = 'Auth0 SSO'

class Auth0SSO extends SSOBase {
    static LOGIN_URI = '/api/v1/auth0/login'
    static CALLBACK_URI = '/api/v1/auth0/callback'
    static LOGOUT_URI = '/api/v1/auth0/logout'

    getProviderName(): string {
        return PROVIDER_NAME_AUTH0_SSO
    }

    static getCallbackURL(): string {
        const APP_URL = process.env.APP_URL || 'http://127.0.0.1:' + process.env.PORT
        return APP_URL + Auth0SSO.CALLBACK_URI
    }

    setSSOConfig(ssoConfig: any) {
        super.setSSOConfig(ssoConfig)
        if (ssoConfig) {
            const { domain, clientID, clientSecret } = this.ssoConfig

            passport.use(
                'auth0',
                new Auth0Strategy(
                    {
                        domain: domain || 'your_auth0_domain',
                        clientID: clientID || 'your_auth0_client_id',
                        clientSecret: clientSecret || 'your_auth0_client_secret',
                        callbackURL: Auth0SSO.getCallbackURL() || 'http://localhost:3000/auth/auth0/callback',
                        passReqToCallback: true
                    },
                    async (
                        req: Request,
                        accessToken: string,
                        refreshToken: string,
                        extraParams: any,
                        profile: Profile,
                        done: (error: any, user?: any) => void
                    ) => {
                        const email = profile.emails?.[0]?.value
                        if (!email) {
                            await auditService.recordLoginActivity(
                                '<empty>',
                                LoginActivityCode.UNKNOWN_USER,
                                ErrorMessage.UNKNOWN_USER,
                                PROVIDER_NAME_AUTH0_SSO
                            )
                            return done({ name: 'SSO_LOGIN_FAILED', message: ErrorMessage.UNKNOWN_USER }, undefined)
                        }
                        return await this.verifyAndLogin(this.app, email, done, profile, accessToken, refreshToken)
                    }
                )
            )
        } else {
            passport.unuse('auth0')
        }
    }

    initialize() {
        this.setSSOConfig(this.ssoConfig)

        this.app.get(Auth0SSO.LOGIN_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Auth0 SSO is not configured.' })
            }
            passport.authenticate('auth0', {
                scope: 'openid profile email' // Request scopes for profile and email information
            })(req, res, next)
        })

        this.app.get(Auth0SSO.CALLBACK_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Auth0 SSO is not configured.' })
            }
            passport.authenticate('auth0', async (err: any, user: LoggedInUser) => {
                try {
                    if (err || !user) {
                        if (err?.name == 'SSO_LOGIN_FAILED') {
                            const error = { message: err.message }
                            const signinUrl = `/signin?error=${encodeURIComponent(JSON.stringify(error))}`
                            return res.redirect(signinUrl)
                        }
                        return next ? next(err) : res.status(401).json(err)
                    }

                    req.session.regenerate((regenerateErr) => {
                        if (regenerateErr) {
                            return next ? next(regenerateErr) : res.status(500).json({ message: 'Session regeneration failed' })
                        }

                        req.login(user, { session: true }, async (error) => {
                            if (error) return next ? next(error) : res.status(401).json(error)
                            return setTokenOrCookies(res, user, true, req, true, true)
                        })
                    })
                } catch (error) {
                    return next ? next(error) : res.status(401).json(error)
                }
            })(req, res, next)
        })
    }

    static async testSetup(ssoConfig: any) {
        const { domain, clientID, clientSecret } = ssoConfig

        try {
            const tokenResponse = await axios.post(
                `https://${domain}/oauth/token`,
                {
                    client_id: clientID,
                    client_secret: clientSecret,
                    audience: `https://${domain}/api/v2/`,
                    grant_type: 'client_credentials'
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            return { message: tokenResponse.status }
        } catch (error) {
            const errorMessage = 'Auth0 Configuration test failed. Please check your credentials and domain.'
            return { error: errorMessage }
        }
    }

    async refreshToken(ssoRefreshToken: string) {
        const { domain, clientID, clientSecret } = this.ssoConfig

        try {
            const response = await axios.post(
                `https://${domain}/oauth/token`,
                {
                    client_id: clientID,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: ssoRefreshToken
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            return { ...response.data }
        } catch (error) {
            const errorMessage = 'Failed to get refreshToken from Auth0.'
            return { error: errorMessage }
        }
    }
}

export default Auth0SSO
