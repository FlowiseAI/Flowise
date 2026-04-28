// AzureSSO.ts
import SSOBase from './SSOBase'
import passport from 'passport'
import { Profile, Strategy as OpenIDConnectStrategy, VerifyCallback } from 'passport-openidconnect'
import { Request } from 'express'
import auditService from '../services/audit'
import { ErrorMessage, LoggedInUser, LoginActivityCode } from '../Interface.Enterprise'
import { setTokenOrCookies } from '../middleware/passport'
import axios from 'axios'

class AzureSSO extends SSOBase {
    static LOGIN_URI = '/api/v1/azure/login'
    static CALLBACK_URI = '/api/v1/azure/callback'
    static LOGOUT_URI = '/api/v1/azure/logout'

    getProviderName(): string {
        return 'Microsoft SSO'
    }

    static getCallbackURL(): string {
        const APP_URL = process.env.APP_URL || 'http://127.0.0.1:' + process.env.PORT
        return APP_URL + AzureSSO.CALLBACK_URI
    }

    initialize() {
        this.setSSOConfig(this.ssoConfig)

        this.app.get(AzureSSO.LOGIN_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Azure SSO is not configured.' })
            }
            passport.authenticate('azure-ad', async () => {
                if (next) next()
            })(req, res, next)
        })

        this.app.get(AzureSSO.CALLBACK_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Azure SSO is not configured.' })
            }
            passport.authenticate('azure-ad', async (err: any, user: LoggedInUser) => {
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

    setSSOConfig(ssoConfig: any) {
        super.setSSOConfig(ssoConfig)
        if (this.ssoConfig) {
            const { tenantID, clientID, clientSecret } = this.ssoConfig
            passport.use(
                'azure-ad',
                new OpenIDConnectStrategy(
                    {
                        issuer: `https://login.microsoftonline.com/${tenantID}/v2.0`,
                        authorizationURL: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/authorize`,
                        tokenURL: `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
                        userInfoURL: `https://graph.microsoft.com/oidc/userinfo`,
                        clientID: clientID || 'your_client_id',
                        clientSecret: clientSecret || 'your_client_secret',
                        callbackURL: AzureSSO.getCallbackURL(),
                        scope: 'openid profile email offline_access',
                        passReqToCallback: true
                    },
                    async (
                        req: Request,
                        issuer: string,
                        profile: Profile,
                        context: object,
                        idToken: string | object,
                        accessToken: string | object,
                        refreshToken: string,
                        done: VerifyCallback
                    ) => {
                        const email = profile.username
                        if (!email) {
                            await auditService.recordLoginActivity(
                                '<empty>',
                                LoginActivityCode.UNKNOWN_USER,
                                ErrorMessage.UNKNOWN_USER,
                                this.getProviderName()
                            )
                            return done({ name: 'SSO_LOGIN_FAILED', message: ErrorMessage.UNKNOWN_USER }, undefined)
                        }
                        return this.verifyAndLogin(this.app, email, done, profile, accessToken, refreshToken)
                    }
                )
            )
        } else {
            passport.unuse('azure-ad')
        }
    }

    static async testSetup(ssoConfig: any) {
        const { tenantID, clientID, clientSecret } = ssoConfig

        try {
            const tokenResponse = await axios.post(
                `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
                new URLSearchParams({
                    client_id: clientID,
                    client_secret: clientSecret,
                    grant_type: 'client_credentials',
                    scope: 'https://graph.microsoft.com/.default'
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            )
            return { message: tokenResponse.statusText }
        } catch (error) {
            const errorMessage = 'Microsoft Configuration test failed. Please check your credentials and Tenant ID.'
            return { error: errorMessage }
        }
    }

    async refreshToken(ssoRefreshToken: string) {
        const { tenantID, clientID, clientSecret } = this.ssoConfig

        try {
            const response = await axios.post(
                `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`,
                new URLSearchParams({
                    client_id: clientID || '',
                    client_secret: clientSecret || '',
                    grant_type: 'refresh_token',
                    refresh_token: ssoRefreshToken,
                    scope: 'openid profile email'
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            )
            return { ...response.data }
        } catch (error) {
            const errorMessage = 'Failed to get refreshToken from Azure.'
            return { error: errorMessage }
        }
    }
}

export default AzureSSO
