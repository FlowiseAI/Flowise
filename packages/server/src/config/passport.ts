import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import { Strategy as CustomStrategy } from 'passport-custom'
import { fetchMCPMetadata } from '../utils/mcp-metadata'

export default function (passport: any) {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(
            `google`,
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID ?? '',
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
                    callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
                    proxy: true
                },
                async (accessToken, refreshToken, profile, done) => {
                    const expiresAt = new Date()
                    expiresAt.setHours(expiresAt.getHours() + 1)
                    const newCredential = {
                        fullName: profile.displayName,
                        email: profile.emails?.[0]?.value ?? '',
                        provider: profile.provider,
                        providerId: profile.id,
                        googleAccessToken: accessToken,
                        googleRefreshToken: refreshToken,
                        expiresAt
                    }
                    try {
                        done(null, newCredential)
                    } catch (err) {
                        console.error('Passport Error:', err)
                        done(err, undefined)
                    }
                }
            )
        )
    }

    if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET && process.env.SALESFORCE_INSTANCE_URL) {
        passport.use(
            `salesforce-dynamic`,
            new OAuth2Strategy(
                {
                    authorizationURL: `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/authorize`,
                    tokenURL: `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/token`,
                    clientID: process.env.SALESFORCE_CLIENT_ID,
                    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
                    callbackURL: `${process.env.API_HOST}/api/v1/salesforce-auth/callback`,
                    scope: 'api refresh_token',
                    passReqToCallback: true,
                    pkce: true,
                    state: true
                },
                async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
                    try {
                        // Fetch user info from Salesforce
                        const response = await fetch(`${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/userinfo`, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`
                            }
                        })
                        const userInfo = await response.json()

                        const newCredential = {
                            refreshToken: refreshToken,
                            userInfo: userInfo
                        }
                        done(null, newCredential)
                    } catch (error) {
                        console.error('Salesforce OAuth Error:', error)
                        done(error, undefined)
                    }
                }
            )
        )
    }

    // Atlassian MCP OAuth Strategy
    // Import the OAuth utilities from utils
    const { getPendingRegistration, clearPendingRegistration, createCompleteCredentialData } = require('../utils')

    passport.use(
        'atlassian-dynamic',
        new CustomStrategy(async (req: any, done: any) => {
            try {
                const code = req.query?.code as string
                const state = req.query?.state as string
                const error = req.query?.error as string

                if (error) {
                    return done(null, false, { message: `OAuth error: ${error}` })
                }

                if (!code) {
                    return done(null, false, { message: 'Authorization code missing' })
                }

                const baseUrl = process.env.ATLASSIAN_MCP_SERVER_URL
                if (!baseUrl) {
                    return done(null, false, { message: 'ATLASSIAN_MCP_SERVER_URL environment variable is not set' })
                }

                // Get MCP client info from state parameter (sessionId)
                const sessionId = state
                const mcpClientInfo = sessionId ? getPendingRegistration(sessionId) : null

                if (!mcpClientInfo) {
                    return done(null, false, { message: 'MCP client info not found. Please restart the OAuth flow.' })
                }

                // Fetch MCP metadata and use MCP client credentials
                const metadata = await fetchMCPMetadata(baseUrl)
                const tokenURL = metadata.token_endpoint
                const clientId = mcpClientInfo.client_id
                const clientSecret = mcpClientInfo.client_secret

                // Exchange authorization code for tokens
                const tokenResponse = await fetch(tokenURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json'
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: clientId,
                        client_secret: clientSecret,
                        code: code,
                        redirect_uri: `${process.env.API_HOST}/api/v1/atlassian-auth/callback`
                    })
                })

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text()
                    console.error('Token exchange failed:', errorText)
                    return done(null, false, { message: `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}` })
                }

                const tokenData = await tokenResponse.json()

                // Use the centralized function to create complete credential data
                const tokens = {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_in: tokenData.expires_in || 3600
                }

                const baseCredentialData = {
                    userInfo: {} // We'll skip profile fetching for now
                }

                const newCredential = createCompleteCredentialData(sessionId, tokens, baseCredentialData)

                // Clean up the temporary session
                clearPendingRegistration(sessionId)

                done(null, newCredential)
            } catch (error) {
                console.error('Atlassian OAuth Error:', error)
                done(error, undefined)
            }
        })
    )

    passport.serializeUser((user: any, done: any) => {
        done(null, user)
    })

    passport.deserializeUser((user: any, done: any) => {
        done(null, false)
    })
}
