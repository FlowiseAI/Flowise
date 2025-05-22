import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import passport from 'passport'

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Error: authController.authenticate - Missing Google OAuth credentials'
            )
        }
        passport.authenticate('google', {
            scope: [
                'profile',
                'email',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive.metadata.readonly',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.labels',
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events.readonly',
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ],
            accessType: 'offline',
            prompt: 'consent'
        })(req, res, next)
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error: authController.authenticate', error)
        next(error)
    }
}

const googleAuthCallback = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: authController.googleAuthCallback - Authentication failed')
        }

        // Using "*" as the target origin allows the message to be received by any window
        // The opener window will still need to validate the message source for security
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
        console.error('Auth callback error:', error)
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
    googleAuthCallback
}
