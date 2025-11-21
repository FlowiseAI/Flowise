// GoogleSSO.ts
import SSOBase from './SSOBase'
import passport from 'passport'
import { Profile, Strategy as OpenIDConnectStrategy, VerifyCallback } from 'passport-openidconnect'
import auditService from '../services/audit'
import { ErrorMessage, LoggedInUser, LoginActivityCode } from '../Interface.Enterprise'
import { setTokenOrCookies } from '../middleware/passport'
import axios from 'axios'

class GoogleSSO extends SSOBase {
    static LOGIN_URI = '/api/v1/google/login'
    static CALLBACK_URI = '/api/v1/google/callback'
    static LOGOUT_URI = '/api/v1/google/logout'

    getProviderName(): string {
        return 'Google SSO'
    }

    static getCallbackURL(): string {
        const APP_URL = process.env.APP_URL || 'http://127.0.0.1:' + process.env.PORT
        return APP_URL + GoogleSSO.CALLBACK_URI
    }

    setSSOConfig(ssoConfig: any) {
        super.setSSOConfig(ssoConfig)
        if (this.ssoConfig) {
            const clientID = this.ssoConfig.clientID
            const clientSecret = this.ssoConfig.clientSecret

            passport.use(
                'google',
                new OpenIDConnectStrategy(
                    {
                        issuer: 'https://accounts.google.com',
                        authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
                        tokenURL: 'https://oauth2.googleapis.com/token',
                        userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
                        clientID: clientID || 'your_google_client_id',
                        clientSecret: clientSecret || 'your_google_client_secret',
                        callbackURL: GoogleSSO.getCallbackURL() || 'http://localhost:3000/auth/google/callback',
                        scope: 'openid profile email'
                    },
                    async (
                        issuer: string,
                        profile: Profile,
                        context: object,
                        idToken: string | object,
                        accessToken: string | object,
                        refreshToken: string,
                        done: VerifyCallback
                    ) => {
                        if (profile.emails && profile.emails.length > 0) {
                            const email = profile.emails[0].value
                            return this.verifyAndLogin(this.app, email, done, profile, accessToken, refreshToken)
                        } else {
                            await auditService.recordLoginActivity(
                                '<empty>',
                                LoginActivityCode.UNKNOWN_USER,
                                ErrorMessage.UNKNOWN_USER,
                                this.getProviderName()
                            )
                            return done({ name: 'SSO_LOGIN_FAILED', message: ErrorMessage.UNKNOWN_USER }, undefined)
                        }
                    }
                )
            )
        } else {
            passport.unuse('google')
        }
    }

    initialize() {
        if (this.ssoConfig) {
            this.setSSOConfig(this.ssoConfig)
        }

        this.app.get(GoogleSSO.LOGIN_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Google SSO is not configured.' })
            }
            passport.authenticate('google', async () => {
                if (next) next()
            })(req, res, next)
        })

        this.app.get(GoogleSSO.CALLBACK_URI, (req, res, next?) => {
            if (!this.getSSOConfig()) {
                return res.status(400).json({ error: 'Google SSO is not configured.' })
            }
            passport.authenticate('google', async (err: any, user: LoggedInUser) => {
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
        const { clientID, redirectURL } = ssoConfig

        try {
            const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
                client_id: clientID,
                redirect_uri: redirectURL,
                response_type: 'code',
                scope: 'openid email profile'
            }).toString()}`

            const tokenResponse = await axios.get(authorizationUrl)
            return { message: tokenResponse.statusText }
        } catch (error) {
            const errorMessage = 'Google Configuration test failed. Please check your credentials.'
            return { error: errorMessage }
        }
    }

    async refreshToken(ssoRefreshToken: string) {
        const { clientID, clientSecret } = this.ssoConfig

        try {
            const response = await axios.post(
                `https://oauth2.googleapis.com/token`,
                new URLSearchParams({
                    client_id: clientID || '',
                    client_secret: clientSecret || '',
                    grant_type: 'refresh_token',
                    refresh_token: ssoRefreshToken,
                    scope: 'refresh_token'
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            )
            return { ...response.data }
        } catch (error) {
            const errorMessage = 'Failed to get refreshToken from Google.'
            return { error: errorMessage }
        }
    }
}

export default GoogleSSO
