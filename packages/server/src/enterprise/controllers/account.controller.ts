import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { emitEvent, TelemetryEventCategory, TelemetryEventResult } from '../../utils/telemetry'
import { Organization } from '../database/entities/organization.entity'
import { User } from '../database/entities/user.entity'
import { AccountDTO, AccountService } from '../services/account.service'

export class AccountController {
    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const sanitizedBody = sanitizeRegistrationDTO(req.body)
            const data = await accountService.register(sanitizedBody)
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

    public async confirmEmailChange(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.confirmEmailChange(req.body)
            return res.status(StatusCodes.OK).json(data)
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
            return res.status(StatusCodes.OK).json(data)
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

    public async delete(req: Request, res: Response, next: NextFunction) {
        let queryRunner: QueryRunner | undefined
        try {
            const { confirmationText } = req.body
            if (confirmationText !== 'permanently delete') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Confirmation text must match "permanently delete"')
            }

            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            if (!req.user || !req.ip) throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)

            const accountService = new AccountService()
            await accountService.delete(queryRunner, req.user, req.ip)

            return res.status(StatusCodes.OK).json({ message: 'Account deleted' })
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()

            await emitEvent({
                category: TelemetryEventCategory.AUDIT,
                eventType: 'account-deleted',
                actionType: 'delete',
                userId: req.user?.id ?? 'unknown',
                orgId: req.user?.activeOrganizationId ?? 'unknown',
                resourceId: req.user?.id ?? 'unknown',
                ipAddress: req.ip,
                result: TelemetryEventResult.FAILED,
                metadata: {
                    failureReason: error instanceof InternalFlowiseError ? error.message : 'internal_error'
                }
            })

            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }
}

function sanitizeRegistrationDTO(data: AccountDTO): AccountDTO {
    const sanitized: AccountDTO = {
        user: {},
        organization: {},
        organizationUser: {},
        workspace: {},
        workspaceUser: {},
        role: {}
    }

    // Strict allowlist: only fields a client may supply during registration.
    // Never accept server-managed fields: id, createdBy, updatedBy, createdDate, updatedDate, status, tokenExpiry.
    const allowedUserFields: (keyof User)[] = ['name', 'email', 'credential', 'tempToken']
    if (data.user && typeof data.user === 'object' && !Array.isArray(data.user)) {
        for (const field of allowedUserFields) {
            const value = data.user[field]
            if (value != null) {
                sanitized.user[field] = value as any
            }
        }
        if (data.user.referral != null) {
            sanitized.user.referral = data.user.referral
        }
    }

    // Allow organization.name for Enterprise owner registration (the only path that doesn't hardcode it).
    const allowedOrgFields: (keyof Organization)[] = ['name']
    if (data.organization && typeof data.organization === 'object' && !Array.isArray(data.organization)) {
        for (const field of allowedOrgFields) {
            const value = data.organization[field]
            if (value != null) {
                sanitized.organization[field] = value as any
            }
        }
    }

    return sanitized
}
