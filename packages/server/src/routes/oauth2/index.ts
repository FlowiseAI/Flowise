/**
 * OAuth2 Authorization Code Flow Implementation
 *
 * This module implements a complete OAuth2 authorization code flow for Flowise credentials.
 * It supports Microsoft Graph and other OAuth2 providers.
 *
 * CREDENTIAL DATA STRUCTURE:
 * The credential's encryptedData should contain a JSON object with the following fields:
 *
 * Required fields:
 * - client_id: OAuth2 application client ID
 * - client_secret: OAuth2 application client secret
 *
 * Optional fields (provider-specific):
 * - tenant_id: Microsoft Graph tenant ID (if using Microsoft Graph)
 * - authorization_endpoint: Custom authorization URL (defaults to Microsoft Graph if tenant_id provided)
 * - token_endpoint: Custom token URL (defaults to Microsoft Graph if tenant_id provided)
 * - redirect_uri: Custom redirect URI (defaults to this callback endpoint)
 * - scope: OAuth2 scopes to request (e.g., "user.read mail.read")
 * - response_type: OAuth2 response type (defaults to "code")
 * - response_mode: OAuth2 response mode (defaults to "query")
 *
 * ENDPOINTS:
 *
 * 1. POST /api/v1/oauth2/authorize/:credentialId
 *    - Generates authorization URL for initiating OAuth2 flow
 *    - Uses credential ID as state parameter for security
 *    - Returns authorization URL to redirect user to
 *
 * 2. GET /api/v1/oauth2/callback
 *    - Handles OAuth2 callback with authorization code
 *    - Exchanges code for access token
 *    - Updates credential with token data
 *    - Supports Microsoft Graph and custom OAuth2 providers
 *
 * 3. POST /api/v1/oauth2/refresh/:credentialId
 *    - Refreshes expired access tokens using refresh token
 *    - Updates credential with new token data
 *
 * USAGE FLOW:
 * 1. Create a credential with OAuth2 configuration (client_id, client_secret, etc.)
 * 2. Call POST /oauth2/authorize/:credentialId to get authorization URL
 * 3. Redirect user to authorization URL
 * 4. User authorizes and gets redirected to callback endpoint
 * 5. Callback endpoint exchanges code for tokens and saves them
 * 6. Use POST /oauth2/refresh/:credentialId when tokens expire
 *
 * TOKEN STORAGE:
 * After successful authorization, the credential will contain additional fields:
 * - access_token: OAuth2 access token
 * - refresh_token: OAuth2 refresh token (if provided)
 * - token_type: Token type (usually "Bearer")
 * - expires_in: Token lifetime in seconds
 * - expires_at: Token expiry timestamp (ISO string)
 * - granted_scope: Actual scopes granted by provider
 * - token_received_at: When token was received (ISO string)
 */

import express from 'express'
import axios from 'axios'
import { Request, Response, NextFunction } from 'express'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { decryptCredentialData, encryptCredentialData } from '../../utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { generateSuccessPage, generateErrorPage } from './templates'

const router = express.Router()

// Initiate OAuth2 authorization flow
router.post('/authorize/:credentialId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { credentialId } = req.params

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        // Find credential by ID
        const credential = await credentialRepository.findOneBy({
            id: credentialId
        })

        if (!credential) {
            return res.status(404).json({
                success: false,
                message: 'Credential not found'
            })
        }

        // Decrypt the credential data to get OAuth configuration
        const decryptedData = await decryptCredentialData(credential.encryptedData)

        const {
            clientId,
            authorizationUrl,
            redirect_uri,
            scope,
            response_type = 'code',
            response_mode = 'query',
            additionalParameters = ''
        } = decryptedData

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Missing clientId in credential data'
            })
        }

        if (!authorizationUrl) {
            return res.status(400).json({
                success: false,
                message: 'No authorizationUrl specified in credential data'
            })
        }

        const defaultRedirectUri = `${req.protocol}://${req.get('host')}/api/v1/oauth2-credential/callback`
        const finalRedirectUri = redirect_uri || defaultRedirectUri

        const authParams = new URLSearchParams({
            client_id: clientId,
            response_type,
            response_mode,
            state: credentialId, // Use credential ID as state parameter
            redirect_uri: finalRedirectUri
        })

        if (scope) {
            authParams.append('scope', scope)
        }

        let fullAuthorizationUrl = `${authorizationUrl}?${authParams.toString()}`

        if (additionalParameters) {
            fullAuthorizationUrl += `&${additionalParameters.toString()}`
        }

        res.json({
            success: true,
            message: 'Authorization URL generated successfully',
            credentialId,
            authorizationUrl: fullAuthorizationUrl,
            redirectUri: finalRedirectUri
        })
    } catch (error) {
        next(
            new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `OAuth2 authorization error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        )
    }
})

// OAuth2 callback endpoint
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, error, error_description } = req.query

        if (error) {
            const errorHtml = generateErrorPage(
                error as string,
                (error_description as string) || 'An error occurred',
                error_description ? `Description: ${error_description}` : undefined
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        if (!code || !state) {
            const errorHtml = generateErrorPage('Missing required parameters', 'Missing code or state', 'Please try again later.')

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        // Find credential by state (assuming state contains the credential ID)
        const credential = await credentialRepository.findOneBy({
            id: state as string
        })

        if (!credential) {
            const errorHtml = generateErrorPage(
                'Credential not found',
                `Credential not found for the provided state: ${state}`,
                'Please try the authorization process again.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(404).send(errorHtml)
        }

        const decryptedData = await decryptCredentialData(credential.encryptedData)

        const { clientId, clientSecret, accessTokenUrl, redirect_uri, scope } = decryptedData

        if (!clientId || !clientSecret) {
            const errorHtml = generateErrorPage(
                'Missing OAuth configuration',
                'Missing clientId or clientSecret',
                'Please check your credential setup.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        let tokenUrl = accessTokenUrl
        if (!tokenUrl) {
            const errorHtml = generateErrorPage(
                'Missing token endpoint URL',
                'No Access Token URL specified in credential data',
                'Please check your credential configuration.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        const defaultRedirectUri = `${req.protocol}://${req.get('host')}/api/v1/oauth2-credential/callback`
        const finalRedirectUri = redirect_uri || defaultRedirectUri

        const tokenRequestData: any = {
            client_id: clientId,
            client_secret: clientSecret,
            code: code as string,
            grant_type: 'authorization_code',
            redirect_uri: finalRedirectUri
        }

        if (scope) {
            tokenRequestData.scope = scope
        }

        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams(tokenRequestData).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            }
        })

        const tokenData = tokenResponse.data

        // Update the credential data with token information
        const updatedCredentialData: any = {
            ...decryptedData,
            ...tokenData,
            token_received_at: new Date().toISOString()
        }

        // Add refresh token if provided
        if (tokenData.refresh_token) {
            updatedCredentialData.refresh_token = tokenData.refresh_token
        }

        // Calculate token expiry time
        if (tokenData.expires_in) {
            const expiryTime = new Date(Date.now() + tokenData.expires_in * 1000)
            updatedCredentialData.expires_at = expiryTime.toISOString()
        }

        // Encrypt the updated credential data
        const encryptedData = await encryptCredentialData(updatedCredentialData)

        // Update the credential in the database
        await credentialRepository.update(credential.id, {
            encryptedData,
            updatedDate: new Date()
        })

        // Return HTML that closes the popup window on success
        const successHtml = generateSuccessPage(credential.id)

        res.setHeader('Content-Type', 'text/html')
        res.send(successHtml)
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error
            const errorHtml = generateErrorPage(
                axiosError.response?.data?.error || 'token_exchange_failed',
                axiosError.response?.data?.error_description || 'Token exchange failed',
                axiosError.response?.data?.error_description ? `Description: ${axiosError.response?.data?.error_description}` : undefined
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        // Generic error HTML page
        const errorHtml = generateErrorPage(
            'An unexpected error occurred',
            'Please try again later.',
            error instanceof Error ? error.message : 'Unknown error'
        )

        res.setHeader('Content-Type', 'text/html')
        res.status(500).send(errorHtml)
    }
})

// Refresh OAuth2 access token
router.post('/refresh/:credentialId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { credentialId } = req.params

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        const credential = await credentialRepository.findOneBy({
            id: credentialId
        })

        if (!credential) {
            return res.status(404).json({
                success: false,
                message: 'Credential not found'
            })
        }

        const decryptedData = await decryptCredentialData(credential.encryptedData)

        const { clientId, clientSecret, refresh_token, accessTokenUrl, scope } = decryptedData

        if (!clientId || !clientSecret || !refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required OAuth configuration: clientId, clientSecret, or refresh_token'
            })
        }

        let tokenUrl = accessTokenUrl
        if (!tokenUrl) {
            return res.status(400).json({
                success: false,
                message: 'No Access Token URL specified in credential data'
            })
        }

        const refreshRequestData: any = {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token
        }

        if (scope) {
            refreshRequestData.scope = scope
        }

        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams(refreshRequestData).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            }
        })

        // Extract token data from response
        const tokenData = tokenResponse.data

        // Update the credential data with new token information
        const updatedCredentialData: any = {
            ...decryptedData,
            ...tokenData,
            token_received_at: new Date().toISOString()
        }

        // Update refresh token if a new one was provided
        if (tokenData.refresh_token) {
            updatedCredentialData.refresh_token = tokenData.refresh_token
        }

        // Calculate token expiry time
        if (tokenData.expires_in) {
            const expiryTime = new Date(Date.now() + tokenData.expires_in * 1000)
            updatedCredentialData.expires_at = expiryTime.toISOString()
        }

        // Encrypt the updated credential data
        const encryptedData = await encryptCredentialData(updatedCredentialData)

        // Update the credential in the database
        await credentialRepository.update(credential.id, {
            encryptedData,
            updatedDate: new Date()
        })

        // Return success response
        res.json({
            success: true,
            message: 'OAuth2 token refreshed successfully',
            credentialId: credential.id,
            tokenInfo: {
                ...tokenData,
                has_new_refresh_token: !!tokenData.refresh_token,
                expires_at: updatedCredentialData.expires_at
            }
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error
            return res.status(400).json({
                success: false,
                message: `Token refresh failed: ${axiosError.response?.data?.error_description || axiosError.message}`,
                details: axiosError.response?.data
            })
        }

        next(
            new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `OAuth2 token refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        )
    }
})

export default router
