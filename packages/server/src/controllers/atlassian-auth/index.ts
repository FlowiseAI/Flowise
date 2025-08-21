import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import passport from 'passport'
import { registerOAuthClient } from '../../utils'

// MCP OAuth controller - uses centralized OAuth utilities

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        passport.authenticate('atlassian-dynamic')(req, res, next)
    } catch (error) {
        console.log('Error: Atlassian MCP authController.authenticate', error)
        next(error)
    }
}

const atlassianAuthCallback = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: Atlassian authController.callback - Authentication failed')
        }

        res.setHeader('Content-Type', 'text/html')
        res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'AUTH_SUCCESS',
                      user: ${JSON.stringify(req.user)}
                    }, '*');
                    window.close();
                  }
                </script>
              </body>
            </html>
        `)
    } catch (error) {
        console.error('Atlassian auth callback error:', error)
        res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'AUTH_ERROR',
                      error: ${JSON.stringify(error)}
                    }, '*');
                    window.close();
                  }
                </script>
              </body>
            </html>
        `)
    }
}

const mcpInitialize = async (req: Request, res: Response) => {
    try {
        const redirectUri = `${process.env.API_HOST}/api/v1/atlassian-auth/callback`

        const registrationResult = await registerOAuthClient(redirectUri)

        res.json({
            sessionId: registrationResult.sessionId,
            client_id: registrationResult.client_id,
            authorization_endpoint: registrationResult.authorization_endpoint,
            redirect_uri: redirectUri,
            scope: registrationResult.scope
        })
    } catch (error) {
        console.error('MCP initialization error:', error)
        if (error instanceof InternalFlowiseError) {
            res.status(error.statusCode).json({ error: error.message })
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during MCP initialization' })
        }
    }
}

export default {
    authenticate,
    atlassianAuthCallback,
    mcpInitialize
}
