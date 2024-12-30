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
                'https://www.googleapis.com/auth/gmail.labels'
            ]
            // prompt: 'consent'
        })(req, res, next)
    } catch (error) {
        console.log('Error: authController.authenticate', error)
        next(error)
    }
}

const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: authController.googleAuthCallback - Authentication failed')
        }

        const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_URL : 'http://localhost:3000'

        res.setHeader('Content-Type', 'text/html')
        res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'AUTH_SUCCESS',
                      user: ${JSON.stringify(req.user)}
                    }, '${allowedOrigin}');
                    window.close();
                  }
                </script>
              </body>
            </html>
        `)
    } catch (error) {
        console.error('Auth callback error:', error)
        const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_URL : 'http://localhost:3000'
        res.send(`
            <html>
              <body>
                <script>
                  window.opener.postMessage({ 
                    type: 'AUTH_ERROR',
                    error: ${JSON.stringify(error)}
                  }, '${allowedOrigin}');
                  window.close();
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
