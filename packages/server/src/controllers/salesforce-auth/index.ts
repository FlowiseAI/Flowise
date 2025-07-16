import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import passport from 'passport'

const clientId = process.env.SALESFORCE_CLIENT_ID
const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
const instanceUrl = process.env.SALESFORCE_INSTANCE_URL

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!clientId || !clientSecret || !instanceUrl) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Error: Salesforce OAuth - Missing required Environment Variables: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_INSTANCE_URL'
            )
        }

        // Configure the Salesforce strategy dynamically
        if ((passport as any).configureSalesforceStrategy) {
            ;(passport as any).configureSalesforceStrategy(clientId as string, clientSecret as string, instanceUrl as string)
        }

        passport.authenticate('salesforce-dynamic', {
            scope: 'api refresh_token'
        })(req, res, next)
    } catch (error) {
        console.log('Error: Salesforce authController.authenticate', error)
        next(error)
    }
}

const salesforceAuthCallback = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: Salesforce authController.callback - Authentication failed')
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
        console.error('Salesforce auth callback error:', error)
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

export default {
    authenticate,
    salesforceAuthCallback
}
