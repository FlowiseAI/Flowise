import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AccountService } from '../services/account.service'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

export class AccountController {
    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.register(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async invite(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.invite(req.body, req.user)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.login(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.verify(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.resendVerificationEmail(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.forgotPassword(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.resetPassword(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async createStripeCustomerPortalSession(req: Request, res: Response, next: NextFunction) {
        try {
            const { url: portalSessionUrl } = await getRunningExpressApp().identityManager.createStripeCustomerPortalSession(req)
            return res.status(StatusCodes.OK).json({ url: portalSessionUrl })
        } catch (error) {
            next(error)
        }
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user) {
                const accountService = new AccountService()
                await accountService.logout(req.user)
                if (req.isAuthenticated()) {
                    req.logout((err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Logout failed' })
                        }
                        req.session.destroy((err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to destroy session' })
                            }
                        })
                    })
                } else {
                    // For JWT-based users (owner, org_admin)
                    res.clearCookie('connect.sid') // Clear the session cookie
                    res.clearCookie('token') // Clear the JWT cookie
                    res.clearCookie('refreshToken') // Clear the JWT cookie
                    return res.redirect('/login') // Redirect to the login page
                }
            }
            return res.status(200).json({ message: 'logged_out', redirectTo: `/login` })
        } catch (error) {
            next(error)
        }
    }

    public async getBasicAuth(req: Request, res: Response) {
        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: true
            })
        } else {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: false
            })
        }
    }

    public async checkBasicAuth(req: Request, res: Response) {
        const { username, password } = req.body
        if (username === process.env.FLOWISE_USERNAME && password === process.env.FLOWISE_PASSWORD) {
            return res.json({ message: 'Authentication successful' })
        } else {
            return res.json({ message: 'Authentication failed' })
        }
    }
}
